import type { WASocket, proto } from '@whiskeysockets/baileys';
import { settingsRepo } from '../database/repositories/settings.repo';
import { msgCache } from '../core/msgcache';
import { logger } from '../utils/logger';

/**
 * When anti-delete is on and a message is revoked, re-post the cached
 * original into the same chat, noting who deleted it.
 */
export async function handleAntiDelete(
  sock: WASocket,
  update: { key: proto.IMessageKey; update: Partial<proto.IWebMessageInfo> },
): Promise<void> {
  if (!settingsRepo.getBool('antidelete')) return;

  // A revoke shows up as a message update with a protocolMessage / empty msg.
  const isDelete =
    (update.update as any)?.message === null ||
    (update.update as any)?.messageStubType === 1;
  if (!isDelete) return;

  const id = update.key.id;
  if (!id) return;
  const cached = msgCache.get(id);
  if (!cached) return;

  try {
    const who = cached.sender.split('@')[0];
    await sock.sendMessage(cached.chat, {
      text: `🗑️ *Anti-delete*\n@${who} deleted a message:`,
      mentions: [cached.sender],
    });
    // Forward the original content back.
    await sock.relayMessage(
      cached.chat,
      cached.raw.message!,
      { messageId: undefined as any },
    );
  } catch (err) {
    logger.error({ err }, 'Anti-delete repost failed');
  }
}
