import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import { groupRepo } from '../database/repositories/group.repo';
import { isGroupAdmin, isBotAdmin } from './permission';
import { logger } from '../utils/logger';

// Match protocol URLs, www links, WhatsApp short/invite links, and ordinary
// bare domains such as "example.com/path". The previous expression missed
// bare domains, which are common when users paste links from mobile apps.
const LINK_REGEX =
  /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{2,5})?(?:[/?#][^\s]*)?)/i;
/** Treat 5+ mentions in one message as mass-tagging. */
const MASS_TAG_THRESHOLD = 5;

/** Exported for focused checks without having to execute moderation actions. */
export function containsLink(text: string): boolean {
  return LINK_REGEX.test(text);
}

/**
 * Group content guard: enforces anti-link, anti-tag and anti-word for
 * groups that enable them. Anti-link applies to everyone; the softer guards
 * exempt admins. The bot must be admin to delete/remove. Returns true if the
 * message was handled (blocked).
 */
export async function enforceAntilink(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<boolean> {
  if (!msg.isGroup) return false;

  const settings = groupRepo.get(msg.chat);
  if (!settings) return false;

  // Muted-user enforcement: delete their messages (bot must be admin).
  if (settings.mutedUsers.includes(msg.senderNumber)) {
    if (await isBotAdmin(sock, msg.chat)) {
      try {
        await sock.sendMessage(msg.chat, { delete: msg.raw.key });
      } catch (err) {
        logger.error(
          { err, groupJid: msg.chat, senderJid: msg.sender },
          'Failed to delete muted user message',
        );
      }
      return true;
    }
  }

  // A forwarded WhatsApp Channel post may contain no visible URL in its text;
  // WhatsApp identifies it through forwardedNewsletterMessageInfo instead.
  const isChannelShare =
    msg.isNewsletterForward || msg.type === 'newsletterAdminInviteMessage';
  const hasLink =
    settings.antilink && (containsLink(msg.body) || isChannelShare);
  const massTag =
    settings.antitag && msg.mentions.length >= MASS_TAG_THRESHOLD;
  const badWord =
    settings.antiword &&
    settings.bannedWords.some((w) =>
      msg.body.toLowerCase().includes(w),
    );

  if (!hasLink && !massTag && !badWord) return false;

  // Links are deleted for everyone, including group admins. Admins remain
  // exempt from the softer anti-tag/anti-word guards.
  const senderIsAdmin = await isGroupAdmin(sock, msg.chat, msg.sender);
  if (senderIsAdmin && !hasLink) return false;

  if (!(await isBotAdmin(sock, msg.chat))) {
    logger.warn(
      { groupJid: msg.chat, senderJid: msg.sender },
      'Group guard triggered, but the bot is not detected as an admin',
    );
    return false;
  }

  const reason = hasLink
    ? 'links are not allowed'
    : massTag
      ? 'mass-tagging is not allowed'
      : 'banned words are not allowed';

  try {
    await sock.sendMessage(msg.chat, { delete: msg.raw.key });
  } catch (err) {
    logger.error(
      { err, groupJid: msg.chat, senderJid: msg.sender },
      'Group guard could not delete the offending message',
    );
    return true;
  }

  try {
    // Preserve the sender's real JID. In LID-mode groups, converting its
    // numeric part to @s.whatsapp.net points at a completely different user.
    await sock.sendMessage(msg.chat, {
      text: `🚫 @${msg.senderNumber} ${reason} here.`,
      mentions: [msg.sender],
    });

    // Delete links from everyone, but do not try to remove an admin (or the
    // group owner). Non-admin link senders keep the original remove policy.
    if (hasLink && !senderIsAdmin) {
      await sock.groupParticipantsUpdate(msg.chat, [msg.sender], 'remove');
    }
  } catch (err) {
    logger.error(
      { err, groupJid: msg.chat, senderJid: msg.sender },
      'Group guard follow-up action failed',
    );
  }
  return true;
}
