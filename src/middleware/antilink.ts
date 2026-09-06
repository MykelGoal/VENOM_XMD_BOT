import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import { groupRepo } from '../database/repositories/group.repo';
import { isGroupAdmin, isBotAdmin } from './permission';
import { numberToJid } from '../utils/helpers';
import { logger } from '../utils/logger';

// Matches http(s) links and common invite links.
const LINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com\/)/i;

/**
 * Enforces anti-link in groups where it's enabled. If a non-admin posts
 * a link, the message is deleted and the sender removed (when the bot is
 * an admin). Returns true if the message was handled (blocked).
 */
export async function enforceAntilink(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<boolean> {
  if (!msg.isGroup) return false;
  if (!LINK_REGEX.test(msg.body)) return false;

  const settings = groupRepo.get(msg.chat);
  if (!settings?.antilink) return false;

  // Admins and the bot itself are exempt.
  if (await isGroupAdmin(sock, msg.chat, msg.sender)) return false;
  if (!(await isBotAdmin(sock, msg.chat))) return false;

  try {
    // Delete the offending message.
    await sock.sendMessage(msg.chat, { delete: msg.raw.key });
    // Warn + remove the sender.
    await sock.sendMessage(msg.chat, {
      text: `🚫 @${msg.senderNumber} links are not allowed here.`,
      mentions: [numberToJid(msg.senderNumber)],
    });
    await sock.groupParticipantsUpdate(
      msg.chat,
      [numberToJid(msg.senderNumber)],
      'remove',
    );
  } catch (err) {
    logger.error({ err }, 'Anti-link enforcement failed');
  }
  return true;
}
