import type { WASocket } from '@whiskeysockets/baileys';
import type { ParticipantAction } from '@whiskeysockets/baileys';
import { store } from '../core/store';
import { logger } from '../utils/logger';
import { groupRepo } from '../database/repositories/group.repo';

interface GroupParticipantsUpdate {
  id: string;
  participants: string[];
  action: ParticipantAction;
}

/**
 * Handles members joining/leaving/being promoted. Sends welcome/goodbye
 * messages when the group has that setting enabled (see .welcome command).
 */
export async function handleGroupParticipantsUpdate(
  sock: WASocket,
  { id, participants, action }: GroupParticipantsUpdate,
): Promise<void> {
  // Group membership changed — invalidate cached metadata.
  store.clearGroup(id);
  logger.debug(`Group ${id}: ${action} → ${participants.join(', ')}`);

  const settings = groupRepo.get(id);
  if (!settings?.welcome) return;

  for (const jid of participants) {
    const tag = `@${jid.split('@')[0]}`;
    if (action === 'add') {
      await sock.sendMessage(id, {
        text: `👋 Welcome ${tag}! Glad to have you here.`,
        mentions: [jid],
      });
    } else if (action === 'remove') {
      await sock.sendMessage(id, {
        text: `👋 ${tag} has left. Goodbye!`,
        mentions: [jid],
      });
    }
  }
}
