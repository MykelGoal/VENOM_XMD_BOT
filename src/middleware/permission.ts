import type {
  GroupMetadata,
  WASocket,
} from '@whiskeysockets/baileys';
import { env } from '../config';
import { getBaileys } from '../core/baileys';
import { store } from '../core/store';
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

function sameUser(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const { jidNormalizedUser, areJidsSameUser } = getBaileys();
  return (
    jidNormalizedUser(a) === jidNormalizedUser(b) || areJidsSameUser(a, b)
  );
}

function isAdminInMetadata(
  metadata: GroupMetadata,
  identityJids: string[],
): boolean {
  const participant = metadata.participants.find((p) =>
    // Newer Baileys metadata can expose the addressing ID plus PN (jid) and
    // LID aliases. Check all of them because LID-mode groups do not identify
    // a member by phone number.
    [p.id, p.lid, p.jid].some((jid) =>
      identityJids.some((identity) => sameUser(jid, identity)),
    ),
  );

  return (
    participant?.admin === 'admin' || participant?.admin === 'superadmin'
  );
}

async function getGroupMetadata(
  sock: WASocket,
  groupJid: string,
): Promise<GroupMetadata> {
  let metadata = store.getGroup(groupJid);
  if (!metadata) {
    metadata = await sock.groupMetadata(groupJid);
    store.setGroup(groupJid, metadata);
  }
  return metadata;
}

/**
 * True if the given participant is an admin of the group.
 * Uses cached group metadata where possible and supports PN and LID JIDs.
 */
export async function isGroupAdmin(
  sock: WASocket,
  groupJid: string,
  participantJid: string,
): Promise<boolean> {
  const metadata = await getGroupMetadata(sock, groupJid);
  return isAdminInMetadata(metadata, [participantJid]);
}

/** True if the bot itself is an admin of the group. */
export async function isBotAdmin(
  sock: WASocket,
  groupJid: string,
): Promise<boolean> {
  const metadata = await getGroupMetadata(sock, groupJid);
  const me = sock.authState.creds.me;
  const identities = [sock.user?.id, sock.user?.lid, me?.id, me?.lid].filter(
    (jid): jid is string => Boolean(jid),
  );
  return isAdminInMetadata(metadata, identities);
}
