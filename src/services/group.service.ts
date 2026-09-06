import type { WASocket, GroupMetadata } from '@whiskeysockets/baileys';
import { store } from '../core/store';

/** Fetch group metadata, using the short-lived cache when possible. */
export async function getGroupMetadata(
  sock: WASocket,
  groupJid: string,
): Promise<GroupMetadata> {
  const cached = store.getGroup(groupJid);
  if (cached) return cached;
  const metadata = await sock.groupMetadata(groupJid);
  store.setGroup(groupJid, metadata);
  return metadata;
}

/** Return admin JIDs for a group. */
export async function getGroupAdmins(
  sock: WASocket,
  groupJid: string,
): Promise<string[]> {
  const metadata = await getGroupMetadata(sock, groupJid);
  return metadata.participants
    .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
    .map((p) => p.id);
}

/** Remove participants from a group (bot must be admin). */
export async function removeParticipants(
  sock: WASocket,
  groupJid: string,
  jids: string[],
): Promise<void> {
  await sock.groupParticipantsUpdate(groupJid, jids, 'remove');
  store.clearGroup(groupJid);
}

/** Add participants to a group (bot must be admin). */
export async function addParticipants(
  sock: WASocket,
  groupJid: string,
  jids: string[],
): Promise<void> {
  await sock.groupParticipantsUpdate(groupJid, jids, 'add');
  store.clearGroup(groupJid);
}

/** Promote/demote participants. */
export async function setParticipantRole(
  sock: WASocket,
  groupJid: string,
  jids: string[],
  role: 'promote' | 'demote',
): Promise<void> {
  await sock.groupParticipantsUpdate(groupJid, jids, role);
  store.clearGroup(groupJid);
}
