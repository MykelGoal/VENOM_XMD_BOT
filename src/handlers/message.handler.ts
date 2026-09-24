import type { WASocket } from '@whiskeysockets/baileys';
import type { proto } from '@whiskeysockets/baileys';
import { env } from '../config';
import { serializeMessage } from '../utils/serialize';
import { handleCommand } from './command.handler';
import { enforceAntilink } from '../middleware/antilink';
import { handleAfk } from './afk.handler';
import { handleVoiceNote } from './voice.handler';
import { userRepo } from '../database/repositories/user.repo';
import { groupStatsRepo } from '../database/repositories/groupstats.repo';
import { settingsRepo } from '../database/repositories/settings.repo';
import { msgCache } from '../core/msgcache';
import { logger } from '../utils/logger';

interface Upsert {
  messages: proto.IWebMessageInfo[];
  type: 'notify' | 'append';
}

/**
 * Process small bursts concurrently so a muted spammer cannot outrun a serial
 * delete loop. The cap avoids flooding WhatsApp with an unbounded number of
 * requests when a large notify batch arrives.
 */
const MESSAGE_CONCURRENCY = 8;

/**
 * First stop for every incoming message. Filters noise, serializes messages,
 * runs moderation before slower stats/presence work, then dispatches commands.
 */
export async function handleMessageUpsert(
  sock: WASocket,
  { messages, type }: Upsert,
): Promise<void> {
  if (type !== 'notify') return;

  for (let i = 0; i < messages.length; i += MESSAGE_CONCURRENCY) {
    const batch = messages.slice(i, i + MESSAGE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((raw) => handleOneMessage(sock, raw)),
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        logger.error({ err: result.reason }, 'Failed to process incoming message');
      }
    }
  }
}

async function handleOneMessage(
  sock: WASocket,
  raw: proto.IWebMessageInfo,
): Promise<void> {
  if (!raw.message) return;
  // Ignore status broadcasts.
  if (raw.key.remoteJid === 'status@broadcast') return;

  const msg = serializeMessage(raw, sock);
  if (!msg) return;

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
    return;
  }

  // Moderation is deliberately first. Previously JSON writes and up to three
  // awaited presence calls ran before mute/anti-link, allowing spam to build
  // up faster than the bot's serial delete loop.
  if (await enforceAntilink(sock, msg)) return;

  // Track the user (first-seen, counts).
  userRepo.ensure(msg.senderNumber, raw.pushName ?? undefined);

  // Track per-group member activity (for .groupstats / .active / .inactive).
  if (msg.isGroup) {
    groupStatsRepo.record(msg.chat, msg.senderNumber);
  }

  // Passive presence behaviors only run after moderation has allowed a message.
  if (settingsRepo.getBool('autoread')) {
    await sock.readMessages([raw.key]).catch(() => {});
  }
  if (settingsRepo.getBool('autotyping')) {
    await sock.sendPresenceUpdate('composing', msg.chat).catch(() => {});
  }
  if (settingsRepo.getBool('autorecord')) {
    await sock.sendPresenceUpdate('recording', msg.chat).catch(() => {});
  }

  // Passive: AFK notifications / auto-return.
  await handleAfk(sock, msg);

  // Passive: auto-transcribe incoming voice notes when enabled.
  await handleVoiceNote(sock, msg);

  await handleCommand(sock, msg);
}
