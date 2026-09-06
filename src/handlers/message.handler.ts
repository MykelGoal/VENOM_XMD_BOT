import type { WASocket } from '@whiskeysockets/baileys';
import type { proto } from '@whiskeysockets/baileys';
import { env } from '../config';
import { serializeMessage } from '../utils/serialize';
import { handleCommand } from './command.handler';
import { enforceAntilink } from '../middleware/antilink';
import { handleAfk } from './afk.handler';
import { userRepo } from '../database/repositories/user.repo';
import { settingsRepo } from '../database/repositories/settings.repo';
import { msgCache } from '../core/msgcache';

interface Upsert {
  messages: proto.IWebMessageInfo[];
  type: 'notify' | 'append';
}

/**
 * First stop for every incoming message. Filters noise, serializes the
 * message into a clean shape, runs passive checks (anti-link), then
 * forwards to the command handler.
 */
export async function handleMessageUpsert(
  sock: WASocket,
  { messages, type }: Upsert,
): Promise<void> {
  if (type !== 'notify') return;

  for (const raw of messages) {
    if (!raw.message) continue;
    // Ignore status broadcasts.
    if (raw.key.remoteJid === 'status@broadcast') continue;

    const msg = serializeMessage(raw, sock);
    if (!msg) continue;

    // Cache for anti-delete (before we skip anything).
    if (raw.key.id) {
      msgCache.set(raw.key.id, {
        raw,
        sender: msg.sender,
        chat: msg.chat,
        at: Date.now(),
      });
    }

    // The bot's own messages. Self-mode lets you control the bot from your
    // OWN number (no second phone). It defaults to ON, and the selfmode
    // toggle command itself ALWAYS works from your own number — so you can
    // never lock yourself out. The bot's own replies don't start with the
    // prefix, so there's no reply loop.
    if (msg.fromMe) {
      if (msg.body.startsWith(env.prefix)) {
        const cmdName = msg.body
          .slice(env.prefix.length)
          .trim()
          .split(/\s+/)[0]
          ?.toLowerCase();
        const isSelfToggle = ['selfmode', 'self', 'selfbot'].includes(cmdName);
        if (isSelfToggle || settingsRepo.getBool('selfmode', true)) {
          await handleCommand(sock, msg);
        }
      }
      continue;
    }

    // Track the user (first-seen, counts).
    userRepo.ensure(msg.senderNumber, raw.pushName ?? undefined);

    // Passive presence behaviors.
    if (settingsRepo.getBool('autoread')) {
      await sock.readMessages([raw.key]).catch(() => {});
    }
    if (settingsRepo.getBool('autotyping')) {
      await sock.sendPresenceUpdate('composing', msg.chat).catch(() => {});
    }
    if (settingsRepo.getBool('autorecord')) {
      await sock.sendPresenceUpdate('recording', msg.chat).catch(() => {});
    }

    // Passive: anti-link enforcement. If it blocked, stop here.
    if (await enforceAntilink(sock, msg)) continue;

    // Passive: AFK notifications / auto-return.
    await handleAfk(sock, msg);

    await handleCommand(sock, msg);
  }
}
