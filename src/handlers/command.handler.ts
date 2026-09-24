import type { WASocket } from '@whiskeysockets/baileys';
import { env } from '../config';
import type { SerializedMessage } from '../types/message.type';
import type { CommandContext } from '../types/command.type';
import { loadCommands, resolveCommand } from '../commands';
import { checkCooldown } from '../middleware/cooldown';
import { isBanned } from '../middleware/ban';
import { isOwner, isSudo, isGroupAdmin } from '../middleware/permission';
import { settingsRepo } from '../database/repositories/settings.repo';
import { accessRepo } from '../database/repositories/access.repo';
import { userRepo } from '../database/repositories/user.repo';
import { reply } from '../services/message.service';
import { logger } from '../utils/logger';
import { handleConversation } from './conversation.handler';

// Load all commands once at module initialization.
loadCommands();

/** Route conversational messages or parse and execute a prefixed command. */
export async function handleCommand(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<void> {
  const { prefix } = env;

  if (!msg.body.startsWith(prefix)) {
    await handleConversation(sock, msg);
    return;
  }

  const [rawName, ...args] = msg.body.slice(prefix.length).trim().split(/\s+/);
  const name = rawName.toLowerCase();
  if (!name) return;

  const command = resolveCommand(name);
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
