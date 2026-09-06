import type { WASocket } from '@whiskeysockets/baileys';
import { env } from '../config';
import { store } from '../core/store';
import { jidToNumber } from '../utils/helpers';
import { accessRepo } from '../database/repositories/access.repo';

/** True if the number is listed as a bot owner in .env. */
export function isOwner(number: string): boolean {
  return env.ownerNumbers.includes(number);
}

/** True if the number is an owner or a sudo user. */
export function isSudo(number: string): boolean {
  return isOwner(number) || accessRepo.is(number, 'sudo');
}

/** True if the number is an owner, sudo, or mod. */
export function isMod(number: string): boolean {
  return isSudo(number) || accessRepo.is(number, 'mod');
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
