import type { WASocket } from '@whiskeysockets/baileys';
import type { ParticipantAction } from '@whiskeysockets/baileys';
import { store } from '../core/store';
import { logger } from '../utils/logger';
import { groupRepo } from '../database/repositories/group.repo';
import { getGroupMetadata } from '../services/group.service';

interface GroupParticipantsUpdate {
  id: string;
  participants: string[];
  action: ParticipantAction;
  author?: string;
}

/**
 * Fill placeholders in a welcome/goodbye template.
 *   @user  → mention of the member
 *   @group → group name
 *   @count → member count
 *   @desc  → group description
 */
function renderTemplate(
  template: string,
  vars: { userTag: string; group: string; count: number; desc: string },
): string {
  return template
    .replace(/@user/gi, vars.userTag)
    .replace(/@group/gi, vars.group)
    .replace(/@count/gi, String(vars.count))
    .replace(/@desc/gi, vars.desc || '');
}

/**
 * Handles members joining/leaving/being promoted. Sends welcome/goodbye
 * messages (custom templates supported) and enforces anti-promote/anti-demote.
 */
export async function handleGroupParticipantsUpdate(
  sock: WASocket,
  { id, participants, action, author }: GroupParticipantsUpdate,
): Promise<void> {
  // Group membership changed — invalidate cached metadata.
  store.clearGroup(id);
  logger.debug(`Group ${id}: ${action} → ${participants.join(', ')}`);

  const settings = groupRepo.get(id);
  if (!settings) return;

  // ── Anti-promote / anti-demote ──────────────────────────────
  // Revert role changes NOT made by the bot itself. author is the actor.
  const botJid = sock.user?.id?.split(':')[0];
  const actorNum = author?.split('@')[0]?.split(':')[0];
  const byBot = botJid && actorNum && botJid.includes(actorNum);

  if (action === 'promote' && settings.antipromote && !byBot) {
    try {
      await sock.groupParticipantsUpdate(id, participants, 'demote');
      await sock.sendMessage(id, {
        text: `🛡️ Anti-promote is ON. Reverted unauthorized promotion.`,
      });
    } catch (err) {
      logger.debug({ err }, 'antipromote revert failed (bot not admin?)');
    }
    return;
  }
  if (action === 'demote' && settings.antidemote && !byBot) {
    try {
      await sock.groupParticipantsUpdate(id, participants, 'promote');
      await sock.sendMessage(id, {
        text: `🛡️ Anti-demote is ON. Reverted unauthorized demotion.`,
      });
    } catch (err) {
      logger.debug({ err }, 'antidemote revert failed (bot not admin?)');
    }
    return;
  }

  // ── Welcome / goodbye ───────────────────────────────────────
  if (action === 'add' && !settings.welcome) return;
  if (action === 'remove' && !settings.goodbye) return;
  if (action !== 'add' && action !== 'remove') return;

  let meta;
  try {
    meta = await getGroupMetadata(sock, id);
  } catch {
    meta = undefined;
  }
  const groupName = meta?.subject ?? 'the group';
  const count = meta?.participants.length ?? 0;
  const desc = (meta?.desc as string) ?? '';

  for (const jid of participants) {
    const userTag = `@${jid.split('@')[0]}`;
    if (action === 'add') {
      const tmpl =
        settings.welcomeText?.trim() ||
        '👋 Welcome @user to *@group*!\nYou are member #@count. Enjoy your stay. 🕷️';
      await sock.sendMessage(id, {
        text: renderTemplate(tmpl, { userTag, group: groupName, count, desc }),
        mentions: [jid],
      });
    } else if (action === 'remove') {
      const tmpl =
        settings.goodbyeText?.trim() ||
        '👋 @user has left *@group*. We are now @count members.';
      await sock.sendMessage(id, {
        text: renderTemplate(tmpl, { userTag, group: groupName, count, desc }),
        mentions: [jid],
      });
    }
  }
}
