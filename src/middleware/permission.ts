import type { WASocket } from '@whiskeysockets/baileys';
import { env } from '../config';
import { store } from '../core/store';
import { jidToNumber } from '../utils/helpers';

/** True if the number is listed as a bot owner in .env. */
export function isOwner(number: string): boolean {
  return env.ownerNumbers.includes(number);
}

/**
 * True if the given participant is an admin of the group.
 * Uses cached group metadata where possible.
 */
export async function isGroupAdmin(
  sock: WASocket,
  groupJid: string,
  participantJid: string,
): Promise<boolean> {
  let metadata = store.getGroup(groupJid);
  if (!metadata) {
    metadata = await sock.groupMetadata(groupJid);
    store.setGroup(groupJid, metadata);
  }

  const number = jidToNumber(participantJid);
  const participant = metadata.participants.find(
    (p) => jidToNumber(p.id) === number,
  );
  return (
    participant?.admin === 'admin' || participant?.admin === 'superadmin'
  );
}

/** True if the bot itself is an admin of the group. */
export async function isBotAdmin(
  sock: WASocket,
  groupJid: string,
): Promise<boolean> {
  const botJid = sock.user?.id ?? '';
  return isGroupAdmin(sock, groupJid, botJid);
}
