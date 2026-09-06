import type { WASocket } from '@whiskeysockets/baileys';
import type { proto } from '@whiskeysockets/baileys';
import { serializeMessage } from '../utils/serialize';
import { handleCommand } from './command.handler';
import { enforceAntilink } from '../middleware/antilink';
import { handleAfk } from './afk.handler';
import { userRepo } from '../database/repositories/user.repo';

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

    // Ignore the bot's own messages (flip if you want self-commands).
    if (msg.fromMe) continue;

    // Track the user (first-seen, counts).
    userRepo.ensure(msg.senderNumber, raw.pushName ?? undefined);

    // Passive: anti-link enforcement. If it blocked, stop here.
    if (await enforceAntilink(sock, msg)) continue;

    // Passive: AFK notifications / auto-return.
    await handleAfk(sock, msg);

    await handleCommand(sock, msg);
  }
}
