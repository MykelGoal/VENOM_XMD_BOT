import type { WASocket } from '@whiskeysockets/baileys';
import { env } from '../config';
import type { SerializedMessage } from '../types/message.type';
import type { CommandContext } from '../types/command.type';
import { commands, loadCommands } from '../commands';
import { checkCooldown } from '../middleware/cooldown';
import { isBanned } from '../middleware/ban';
import { isOwner, isSudo, isGroupAdmin } from '../middleware/permission';
import { settingsRepo } from '../database/repositories/settings.repo';
import { accessRepo } from '../database/repositories/access.repo';
import { reply } from '../services/message.service';
import { getAIReply, isAIConfigured } from '../services/ai.service';
import { userRepo } from '../database/repositories/user.repo';
import { logger } from '../utils/logger';

// Load all commands once at module init.
loadCommands();

/**
 * Parses an incoming message for a command, runs middleware checks,
 * then executes the matching command.
 */
export async function handleCommand(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<void> {
  const { prefix } = env;

  // AI auto-reply: respond to normal DMs when enabled and configured.
  if (!msg.body.startsWith(prefix)) {
    if (
      env.ai.autoReply &&
      isAIConfigured() &&
      !msg.isGroup &&
      msg.body.trim().length > 0
    ) {
      const answer = await getAIReply({ prompt: msg.body });
      await reply(sock, msg, answer);
    }
    return;
  }

  const [rawName, ...args] = msg.body.slice(prefix.length).trim().split(/\s+/);
  const name = rawName.toLowerCase();
  if (!name) return;

  const command =
    commands.get(name) ??
    [...commands.values()].find((c) => c.aliases?.includes(name));

  if (!command) return;

  // ── Middleware: banned / ignored users ──────────────────────
  if (isBanned(msg.senderNumber)) return;
  if (accessRepo.is(msg.senderNumber, 'ignored') && !isOwner(msg.senderNumber))
    return;

  // ── Middleware: private mode (owner/sudo only) ──────────────
  const mode = settingsRepo.get('mode') ?? 'public';
  if (mode === 'private' && !isSudo(msg.senderNumber)) return;

  // ── Middleware: permissions ─────────────────────────────────
  if (command.ownerOnly && !isSudo(msg.senderNumber)) {
    await reply(sock, msg, '🚫 This command is for the bot owner only.');
    return;
  }

  if (command.groupOnly && !msg.isGroup) {
    await reply(sock, msg, '🚫 This command only works in groups.');
    return;
  }

  if (command.adminOnly && msg.isGroup) {
    const admin = await isGroupAdmin(sock, msg.chat, msg.sender);
    if (!admin) {
      await reply(sock, msg, '🚫 Only group admins can use this command.');
      return;
    }
  }

  // ── Middleware: cooldown ────────────────────────────────────
  const remaining = checkCooldown(msg.senderNumber, command.name);
  if (remaining > 0) {
    await reply(sock, msg, `⏳ Wait ${remaining}s before using that again.`);
    return;
  }

  // ── Execute ─────────────────────────────────────────────────
  const ctx: CommandContext = {
    sock,
    msg,
    args,
    text: args.join(' '),
    prefix,
  };

  // Auto-react to the command when cmdreact is enabled.
  if (settingsRepo.getBool('cmdreact')) {
    await sock
      .sendMessage(msg.chat, { react: { text: '⚡', key: msg.raw.key } })
      .catch(() => {});
  }

  try {
    await command.run(ctx);
    userRepo.incrementCommands(msg.senderNumber);
    logger.debug(`Ran command "${command.name}" for ${msg.senderNumber}`);
  } catch (err) {
    logger.error({ err }, `Command "${command.name}" failed`);
    await reply(sock, msg, '❌ Something went wrong running that command.');
  }
}
