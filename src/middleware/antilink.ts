import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import { groupRepo } from '../database/repositories/group.repo';
import { isGroupAdmin, isBotAdmin } from './permission';
import { numberToJid } from '../utils/helpers';
import { logger } from '../utils/logger';

// Matches http(s) links and common invite links.
const LINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com\/)/i;
/** Treat 5+ mentions in one message as mass-tagging. */
const MASS_TAG_THRESHOLD = 5;

/**
 * Group content guard: enforces anti-link, anti-tag and anti-word for
 * groups that enable them. Non-admins only; the bot must be admin to
 * delete/remove. Returns true if the message was handled (blocked).
 */
export async function enforceAntilink(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<boolean> {
  if (!msg.isGroup) return false;

  const settings = groupRepo.get(msg.chat);
  if (!settings) return false;

  const hasLink = settings.antilink && LINK_REGEX.test(msg.body);
  const massTag =
    settings.antitag && msg.mentions.length >= MASS_TAG_THRESHOLD;
  const badWord =
    settings.antiword &&
    settings.bannedWords.some((w) =>
      msg.body.toLowerCase().includes(w),
    );

  if (!hasLink && !massTag && !badWord) return false;

  // Admins and the bot itself are exempt.
  if (await isGroupAdmin(sock, msg.chat, msg.sender)) return false;
  if (!(await isBotAdmin(sock, msg.chat))) return false;

  const reason = hasLink
    ? 'links are not allowed'
    : massTag
      ? 'mass-tagging is not allowed'
      : 'banned words are not allowed';

  try {
    await sock.sendMessage(msg.chat, { delete: msg.raw.key });
    await sock.sendMessage(msg.chat, {
      text: `🚫 @${msg.senderNumber} ${reason} here.`,
      mentions: [numberToJid(msg.senderNumber)],
    });
    // Anti-link removes the sender; the softer guards just delete + warn.
    if (hasLink) {
      await sock.groupParticipantsUpdate(
        msg.chat,
        [numberToJid(msg.senderNumber)],
        'remove',
      );
    }
  } catch (err) {
    logger.error({ err }, 'Group guard enforcement failed');
  }
  return true;
}
