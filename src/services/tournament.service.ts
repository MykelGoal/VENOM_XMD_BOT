import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import { env } from '../config';
import type {
  TournamentModel,
  TournamentPlayer,
} from '../database/models/tournament.model';
import {
  tournamentRepo,
  type RankedTournamentPlayer,
} from '../database/repositories/tournament.repo';
import { settingsRepo } from '../database/repositories/settings.repo';
import { flushMongo, isMongoEnabled } from '../database/mongo';
import { isGroupAdmin, isSudo } from '../middleware/permission';
import { getGroupMetadata } from './group.service';
import { jidToNumber, numberToJid, sleep } from '../utils/helpers';
import { logger } from '../utils/logger';

const MILESTONES = new Set([10, 20, 30, 40]);
const MAX_ROUNDS = 3;
const DM_CONCURRENCY = 5;
const ACCOUNT_KEYS = {
  bank: 'tournament.payment.bank',
  number: 'tournament.payment.number',
  name: 'tournament.payment.name',
} as const;

export interface TournamentPaymentAccount {
  bank: string;
  accountNumber: string;
  accountName: string;
}

export function getTournamentPaymentAccount(): TournamentPaymentAccount | null {
  const bank = settingsRepo.get(ACCOUNT_KEYS.bank)?.trim() ?? '';
  const accountNumber = settingsRepo.get(ACCOUNT_KEYS.number)?.trim() ?? '';
  const accountName = settingsRepo.get(ACCOUNT_KEYS.name)?.trim() ?? '';
  if (!bank || !accountNumber || !accountName) return null;
  return { bank, accountNumber, accountName };
}

export function setTournamentPaymentAccount(
  account: TournamentPaymentAccount,
): void {
  settingsRepo.set(ACCOUNT_KEYS.bank, account.bank.trim());
  settingsRepo.set(ACCOUNT_KEYS.number, account.accountNumber.trim());
  settingsRepo.set(ACCOUNT_KEYS.name, account.accountName.trim());
}

export function clearTournamentPaymentAccount(): void {
  settingsRepo.delete(ACCOUNT_KEYS.bank);
  settingsRepo.delete(ACCOUNT_KEYS.number);
  settingsRepo.delete(ACCOUNT_KEYS.name);
}

export function paymentInstructions(
  account: TournamentPaymentAccount,
): string {
  return `${account.bank} — ${account.accountNumber} — ${account.accountName}`;
}

export function tournamentStorageReady(): boolean {
  return isMongoEnabled();
}

/** Wait until the local tournament mutation has reached MongoDB. */
export async function flushTournament(): Promise<void> {
  await flushMongo();
}

export async function canManageTournament(
  sock: WASocket,
  msg: SerializedMessage,
  tournament: TournamentModel,
): Promise<boolean> {
  if (
    isSudo(msg.senderNumber) ||
    digits(msg.senderNumber) === digits(tournament.createdByNumber)
  ) {
    return true;
  }
  try {
    return await isGroupAdmin(sock, tournament.groupJid, msg.sender);
  } catch {
    return false;
  }
}

/** Best group-addressing JID for a DM registrant, including LID groups. */
export async function resolveTournamentGroupJid(
  sock: WASocket,
  tournament: TournamentModel,
  number: string,
): Promise<string | undefined> {
  try {
    const metadata = await getGroupMetadata(sock, tournament.groupJid);
    const normalized = digits(number);
    const participant = metadata.participants.find((entry) =>
      [entry.id, entry.jid, entry.lid].some(
        (jid) => jid && jidToNumber(jid) === normalized,
      ),
    );
    return participant?.id;
  } catch {
    return undefined;
  }
}

/** One compact launch message; all group members are mentioned exactly once. */
export async function sendTournamentAnnouncement(
  sock: WASocket,
  tournament: TournamentModel,
): Promise<void> {
  const metadata = await getGroupMetadata(sock, tournament.groupJid);
  const botIds = [sock.user?.id, sock.user?.lid]
    .filter((jid): jid is string => Boolean(jid))
    .map(jidToNumber);
  const members = metadata.participants
    .map((participant) => participant.id)
    .filter((jid) => !botIds.includes(jidToNumber(jid)));
  const botNumber = jidToNumber(sock.user?.id ?? '');
  const registrationTemplate = `${env.prefix}tourjoin ${tournament.code} Nickname | FreeFireUID`;
  const dmLink = botNumber
    ? `https://wa.me/${botNumber}?text=${encodeURIComponent(registrationTemplate)}`
    : '';
  const tags = members.map((jid) => `@${jidToNumber(jid)}`).join(' ');

  const text = [
    '🔥🏆 *VENOM FREE FIRE SOLO TOURNAMENT* 🏆🔥',
    '',
    `🎟️ *Tournament code:* ${tournament.code}`,
    `📅 *Date/time:* ${tournament.eventDate}`,
    `👥 *Slots:* ${tournament.maxPlayers} verified players`,
    `💳 *Entry:* ₦${tournament.entryFeeNaira.toLocaleString('en-NG')}`,
    '',
    '💰 *PRIZES*',
    `🥇 1st — ₦${tournament.prizes.first.toLocaleString('en-NG')}`,
    `🥈 2nd — ₦${tournament.prizes.second.toLocaleString('en-NG')}`,
    `🥉 3rd — ₦${tournament.prizes.third.toLocaleString('en-NG')}`,
    '',
    '🎮 *Format:* 3 solo custom-room matches',
    '📊 Placement points + 1 point per kill',
    '',
    '📝 *HOW TO ENTER — PRIVATE, NOT IN THIS GROUP*',
    `1. DM the bot: *${registrationTemplate}*`,
    '2. The bot replies privately with the payment account and your reference.',
    `3. Send the receipt back to the bot with *${env.prefix}tourproof ${tournament.code}* as its caption.`,
    '4. Your slot is confirmed only after the organizer verifies the actual bank credit.',
    dmLink ? `\n👉 *Register privately:* ${dmLink}` : '',
    '',
    '⚠️ First 40 verified payments enter. No hacks, scripts, teaming or account switching.',
    '_Registration confirmations and room passwords are sent privately to avoid group spam._',
    '',
    '📣 *Group members notified once:*',
    tags,
  ]
    .filter(Boolean)
    .join('\n');

  await sock.sendMessage(tournament.groupJid, { text, mentions: members });
}

/** Post only 10/20/30/40-player milestones, never every approval. */
export async function postRegistrationMilestone(
  sock: WASocket,
  tournament: TournamentModel,
): Promise<boolean> {
  const approved = tournament.participants.filter(
    (player) => player.paymentStatus === 'approved',
  ).length;
  if (
    !MILESTONES.has(approved) ||
    tournament.announcedMilestones.includes(approved)
  ) {
    return false;
  }

  const remaining = tournament.maxPlayers - approved;
  const text =
    approved >= tournament.maxPlayers
      ? `✅🏆 *${tournament.code} registration is FULL!*\nAll ${approved} paid slots are confirmed. Check-in instructions will be sent next.`
      : `📊 *${tournament.code} update:* ${approved}/${tournament.maxPlayers} paid players confirmed — ${remaining} slots remaining.`;
  await sock.sendMessage(tournament.groupJid, { text });
  tournamentRepo.markMilestone(tournament.code, approved);
  await flushTournament();
  return true;
}

export function tournamentStatusText(tournament: TournamentModel): string {
  const approved = tournament.participants.filter(
    (player) => player.paymentStatus === 'approved',
  ).length;
  const pending = tournament.participants.filter(
    (player) => player.paymentStatus === 'pending',
  ).length;
  const checkedIn = tournament.participants.filter(
    (player) => Boolean(player.checkedInAt),
  ).length;

  return [
    `🏆 *${tournament.code} — Free Fire Solo*`,
    '',
    `📅 ${tournament.eventDate}`,
    `📌 Status: *${tournament.status.toUpperCase()}*`,
    `✅ Paid/approved: ${approved}/${tournament.maxPlayers}`,
    `⏳ Pending verification: ${pending}`,
    `🎮 Checked in: ${checkedIn}/${approved}`,
    `🗺️ Rounds recorded: ${tournament.completedRounds.join(', ') || 'none'}`,
    `💾 Storage: ${isMongoEnabled() ? 'MongoDB (redeploy-safe)' : 'local only ⚠️'}`,
  ].join('\n');
}

export function tournamentPlayersText(tournament: TournamentModel): string {
  const ordered = [...tournament.participants].sort(
    (a, b) => a.joinedAt - b.joinedAt,
  );
  const lines = ordered.map((player, index) => {
    const state =
      player.paymentStatus === 'approved'
        ? player.checkedInAt
          ? '✅🎮'
          : '✅'
        : player.paymentStatus === 'rejected'
          ? '❌'
          : '⏳';
    return `${index + 1}. ${state} ${player.nickname} — UID ${player.freeFireUid}`;
  });
  return (
    `👥 *${tournament.code} players (${ordered.length})*\n\n` +
    (lines.join('\n') || '_No registrations yet._') +
    '\n\n✅ paid · 🎮 checked in · ⏳ pending · ❌ rejected'
  );
}

export function placementPoints(placement: number): number {
  const table: Record<number, number> = {
    1: 12,
    2: 9,
    3: 8,
    4: 7,
    5: 6,
    6: 5,
    7: 4,
    8: 3,
    9: 2,
    10: 1,
  };
  return table[placement] ?? 0;
}

/** Parse `UID,kills,placement; UID,kills,placement` safely. */
export function parseRoundResults(input: string): Array<{
  freeFireUid: string;
  kills: number;
  placement: number;
  placementPoints: number;
}> {
  const entries = input
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length < 2 || entries.length > 40) {
    throw new Error('ROUND_ENTRY_COUNT');
  }

  const seenUids = new Set<string>();
  const seenPlacements = new Set<number>();
  return entries.map((entry) => {
    const [freeFireUid = '', killsRaw = '', placementRaw = ''] = entry
      .split(',')
      .map((part) => part.trim());
    const kills = Number(killsRaw);
    const placement = Number(placementRaw);
    if (!/^\d{6,15}$/.test(freeFireUid)) throw new Error('INVALID_ROUND_ROW');
    if (!Number.isInteger(kills) || kills < 0 || kills > 50) {
      throw new Error('INVALID_ROUND_ROW');
    }
    if (!Number.isInteger(placement) || placement < 1 || placement > 40) {
      throw new Error('INVALID_ROUND_ROW');
    }
    if (seenUids.has(freeFireUid) || seenPlacements.has(placement)) {
      throw new Error('DUPLICATE_ROUND_ROW');
    }
    seenUids.add(freeFireUid);
    seenPlacements.add(placement);
    return {
      freeFireUid,
      kills,
      placement,
      placementPoints: placementPoints(placement),
    };
  });
}

export function validateRound(round: number): void {
  if (!Number.isInteger(round) || round < 1 || round > MAX_ROUNDS) {
    throw new Error('INVALID_ROUND');
  }
}

export function standingsText(
  tournament: TournamentModel,
  ranking: RankedTournamentPlayer[],
): string {
  const round = Math.max(0, ...tournament.completedRounds);
  const lines = ranking.slice(0, 10).map(
    (entry, index) =>
      `${index + 1}. *${entry.player.nickname}* — ${entry.totalPoints} pts · ${entry.totalKills} kills`,
  );
  return [
    `📊🏆 *${tournament.code} STANDINGS — AFTER ROUND ${round}*`,
    '',
    ...lines,
    '',
    `_Tie-break: wins → kills → latest-round placement._`,
  ].join('\n');
}

export function finalResultsMessage(
  tournament: TournamentModel,
  ranking: RankedTournamentPlayer[],
): { text: string; mentions: string[] } {
  const winners = ranking.slice(0, 3);
  const prizes = [
    tournament.prizes.first,
    tournament.prizes.second,
    tournament.prizes.third,
  ];
  const medals = ['🥇', '🥈', '🥉'];
  const mentions = winners.map(
    ({ player }) => player.groupJid ?? numberToJid(player.number),
  );
  const lines = winners.map(
    (entry, index) =>
      `${medals[index]} @${jidToNumber(mentions[index])} — *${entry.player.nickname}*\n` +
      `   ${entry.totalPoints} pts · ${entry.totalKills} kills · ₦${prizes[index].toLocaleString('en-NG')}`,
  );
  return {
    text: [
      `🏆🔥 *${tournament.code} — FINAL RESULTS* 🔥🏆`,
      '',
      ...lines,
      '',
      '🎉 Congratulations to the winners and everyone who participated!',
      '_Organizer: verify winner details privately before paying prizes._',
    ].join('\n'),
    mentions,
  };
}

export async function sendPlayerDM(
  sock: WASocket,
  player: TournamentPlayer,
  text: string,
): Promise<boolean> {
  try {
    await sock.sendMessage(player.jid || numberToJid(player.number), { text });
    return true;
  } catch (err) {
    logger.debug(
      { err, player: player.number },
      'Tournament private notification failed',
    );
    return false;
  }
}

export async function sendPlayerDMs(
  sock: WASocket,
  players: TournamentPlayer[],
  message: (player: TournamentPlayer) => string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let index = 0; index < players.length; index += DM_CONCURRENCY) {
    const batch = players.slice(index, index + DM_CONCURRENCY);
    const results = await Promise.all(
      batch.map((player) => sendPlayerDM(sock, player, message(player))),
    );
    sent += results.filter(Boolean).length;
    failed += results.filter((result) => !result).length;
    if (index + DM_CONCURRENCY < players.length) await sleep(250);
  }
  return { sent, failed };
}

export function tournamentErrorMessage(error: unknown): string {
  const code = (error as Error)?.message ?? '';
  const known: Record<string, string> = {
    INVALID_TOURNAMENT_CODE:
      'Use a 3–20 character tournament code containing letters, numbers or hyphens.',
    TOURNAMENT_EXISTS: 'That tournament code already exists.',
    TOURNAMENT_NOT_FOUND: 'Tournament not found. Check the code.',
    REGISTRATION_CLOSED: 'Registration is closed for this tournament.',
    ALREADY_REGISTERED: 'That WhatsApp account or Free Fire UID is already registered.',
    TOURNAMENT_FULL: 'All 40 paid slots are already filled.',
    PLAYER_NOT_FOUND: 'No registered player matches that UID or phone number.',
    PAYMENT_NOT_PENDING: 'This registration is not waiting for payment verification.',
    TOURNAMENT_CLOSED: 'That tournament is already closed.',
    CHECKIN_CLOSED: 'Check-in has not opened yet.',
    PLAYER_NOT_APPROVED: 'Only paid and approved players can check in.',
    ROUND_ENTRY_COUNT: 'Submit between 2 and 40 result rows.',
    INVALID_ROUND_ROW: 'Each result must be `UID,kills,placement` with valid numbers.',
    DUPLICATE_ROUND_ROW: 'A UID or placement appears more than once in that round.',
    INVALID_ROUND: 'Round must be 1, 2 or 3.',
  };
  if (known[code]) return known[code];
  if (code.startsWith('UNKNOWN_UID:')) {
    return `Unknown or unpaid Free Fire UID: ${code.slice('UNKNOWN_UID:'.length)}`;
  }
  return 'Tournament operation failed. Please check the details and try again.';
}

function digits(value: string): string {
  return value.replace(/\D/g, '');
}
