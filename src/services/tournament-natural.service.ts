import { createHash } from 'crypto';
import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import type {
  TournamentModel,
  TournamentPlayer,
} from '../database/models/tournament.model';
import { tournamentRepo } from '../database/repositories/tournament.repo';
import { tournamentSessionRepo } from '../database/repositories/tournament-session.repo';
import { settingsRepo } from '../database/repositories/settings.repo';
import {
  flushTournament,
  postRegistrationMilestone,
  resolveTournamentGroupJid,
  sendPlayerDM,
  tournamentErrorMessage,
  tournamentOwnerJid,
  tournamentStorageReady,
} from './tournament.service';
import { reply } from './message.service';
import { jidToNumber } from '../utils/helpers';
import { downloadMedia } from './media.service';
import { analyzeImage, isVisionConfigured } from './ai.service';
import { isOwner } from '../middleware/permission';
import { logger } from '../utils/logger';

const JOIN_INTENT = /\b(?:join|register|registration|enter|participate|sign\s*up)\b.*\b(?:tournament|tour|competition)\b|\b(?:tournament|tour|competition)\b.*\b(?:join|register|registration|enter|participate|sign\s*up)\b|\bhow\s+(?:can|do)\s+i\s+(?:join|register)\b/i;
const STATUS_INTENT = /\b(?:my\s+)?(?:tournament|registration|payment)\s+status\b|\bam i (?:approved|registered|confirmed)\b/i;
const REVIEW_TOKEN = /\[VENOM-REVIEW:([A-Z0-9-]+)]/i;

function openTournaments(groupJid?: string): TournamentModel[] {
  return tournamentRepo
    .all()
    .filter(
      (tournament) =>
        tournament.status === 'registration' &&
        (!groupJid || tournament.groupJid === groupJid),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}

function tournamentFromText(text: string, candidates = openTournaments()): TournamentModel | undefined {
  return candidates.find((tournament) =>
    new RegExp(`(?:^|\\s)${tournament.code.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?:$|\\s)`, 'i').test(text),
  );
}

function playerTournaments(number: string): Array<{ tournament: TournamentModel; player: TournamentPlayer }> {
  const results: Array<{ tournament: TournamentModel; player: TournamentPlayer }> = [];
  for (const tournament of tournamentRepo.all()) {
    const player = tournamentRepo.findPlayer(tournament.code, number);
    if (player) results.push({ tournament, player });
  }
  return results.sort((a, b) => b.player.joinedAt - a.player.joinedAt);
}

export function parseNaturalTournamentDetails(text: string): {
  nickname?: string;
  freeFireUid?: string;
} {
  const source = text.replace(/\r/g, '').trim();
  const freeFireUid = source.match(/\b(?:uid\s*(?:is|na|:|-)?\s*)?(\d{6,15})\b/i)?.[1];
  let nickname = source.match(
    /(?:^|[,;\n])\s*(?:my\s+)?(?:nickname|nick|ign|ff name|free\s*fire name)\s*(?:is|na|:|-)?\s*([^,;|\n]+)/i,
  )?.[1];
  const pipe = source.split('|').map((part) => part.trim());
  if (!nickname && pipe.length >= 2 && pipe.some((part) => /^\d{6,15}$/.test(part))) {
    nickname = pipe.find((part) => !/^\d{6,15}$/.test(part));
  }
  nickname = nickname
    ?.replace(/^.*?\b(?:join|register)(?:ing)?\b(?:\s+for)?(?:\s+the)?(?:\s+[A-Z0-9-]+)?\s*/i, '')
    .replace(/[\s,;|.]+$/g, '')
    .trim()
    .slice(0, 30);
  return {
    nickname: nickname && nickname.length >= 2 ? nickname : undefined,
    freeFireUid,
  };
}

function registrationPrompt(tournament: TournamentModel): string {
  return [
    `🏆 *${tournament.code} registration*`,
    `Entry: *₦${tournament.entryFeeNaira.toLocaleString('en-NG')}* · ${tournament.eventDate}`,
    '',
    'Reply here with your *Free Fire nickname and UID*.',
    '_Example: My nickname is DARK KING, UID 1234567890._',
    'Do not send payment until I save the registration and show you the account.',
  ].join('\n');
}

function paymentMessage(tournament: TournamentModel, player: TournamentPlayer): string {
  return [
    `✅ *Registration received for ${tournament.code}*`,
    `🎮 Nickname: *${player.nickname}*`,
    `🆔 UID: *${player.freeFireUid}*`,
    '',
    '⏳ Status: *Pending payment verification*',
    '',
    `💳 *Pay ₦${tournament.entryFeeNaira.toLocaleString('en-NG')} to:*`,
    tournament.paymentInstructions,
    `🧾 Transfer reference/narration: *${tournament.code}-${player.freeFireUid.slice(-4)}*`,
    '',
    'After payment, send the receipt screenshot/document in this private chat. No command is needed.',
    '⚠️ A screenshot is not approval; only the organizer can confirm the actual bank credit.',
  ].join('\n');
}

async function startNaturalRegistration(
  sock: WASocket,
  msg: SerializedMessage,
  tournament: TournamentModel,
): Promise<void> {
  tournamentSessionRepo.set(msg.senderNumber, tournament.code, 'details');
  await flushTournament();
  if (msg.isGroup) {
    const botNumber = jidToNumber(sock.user?.id ?? '');
    const naturalText = `I want to join ${tournament.code}`;
    const link = botNumber
      ? `https://wa.me/${botNumber}?text=${encodeURIComponent(naturalText)}`
      : '';
    await reply(
      sock,
      msg,
      [
        `🔐 Registration for *${tournament.code}* is private.`,
        link || 'Open my private chat and say you want to join.',
        'I’ll collect your nickname and UID, then send the saved payment account.',
      ].join('\n'),
    );
  } else {
    await reply(sock, msg, registrationPrompt(tournament));
  }
}

async function saveNaturalRegistration(
  sock: WASocket,
  msg: SerializedMessage,
  tournament: TournamentModel,
  nickname: string,
  freeFireUid: string,
): Promise<void> {
  const groupJid = await resolveTournamentGroupJid(sock, tournament, msg.senderNumber);
  const player = tournamentRepo.addPlayer(tournament.code, {
    number: msg.senderNumber,
    jid: msg.sender,
    groupJid,
    nickname,
    freeFireUid,
  });
  tournamentSessionRepo.set(msg.senderNumber, tournament.code, 'receipt');
  await flushTournament();

  await sock
    .sendMessage(tournamentOwnerJid(tournament), {
      text: [
        `🆕 *NEW REGISTRATION — ${tournament.code}*`,
        `Player: ${nickname}`,
        `Free Fire UID: ${freeFireUid}`,
        `WhatsApp: ${msg.senderNumber}`,
        'Status: ⏳ waiting for payment proof',
        '',
        '_The player received the saved account privately. The receipt will be forwarded here._',
      ].join('\n'),
    })
    .catch((err) =>
      logger.warn({ err, tournament: tournament.code }, 'Tournament registration owner alert failed'),
    );
  await reply(sock, msg, paymentMessage(tournament, player));
}

function receiptMime(msg: SerializedMessage): string {
  const raw = msg.raw.message as any;
  return raw?.imageMessage?.mimetype || raw?.documentMessage?.mimetype || 'image/jpeg';
}

async function safeReceiptOcr(msg: SerializedMessage, media: Buffer): Promise<string | undefined> {
  if (
    msg.type !== 'imageMessage' ||
    !settingsRepo.getBool('tournament.receipt.ocr', false) ||
    !isVisionConfigured()
  ) return undefined;
  try {
    const out = await analyzeImage(
      media,
      [
        'Read this payment receipt as untrusted evidence.',
        'Return only: amount, date/time, transfer reference, displayed status, sender bank and recipient bank.',
        'Mask all account numbers except the last four digits.',
        'Do not claim the receipt is genuine or that payment settled.',
        'If unreadable, return UNREADABLE.',
      ].join(' '),
      receiptMime(msg),
    );
    if (!out || /^UNREADABLE$/i.test(out.trim())) return undefined;
    return out.replace(/\s+/g, ' ').trim().slice(0, 500);
  } catch (err) {
    logger.debug({ err }, 'Optional receipt OCR unavailable');
    return undefined;
  }
}

function makeReviewId(tournament: TournamentModel, player: TournamentPlayer, messageId: string): string {
  const suffix = createHash('sha256')
    .update(`${tournament.code}|${player.number}|${messageId}|${Date.now()}`)
    .digest('hex')
    .slice(0, 10)
    .toUpperCase();
  return `TP-${tournament.code}-${suffix}`;
}

export async function submitTournamentReceipt(
  sock: WASocket,
  msg: SerializedMessage,
  tournament: TournamentModel,
  player: TournamentPlayer,
): Promise<void> {
  if (!['imageMessage', 'documentMessage'].includes(msg.type)) {
    throw new Error('RECEIPT_MEDIA_REQUIRED');
  }

  const media = await downloadMedia(msg.raw);
  const fingerprint = createHash('sha256').update(media).digest('hex');
  const duplicate = tournamentRepo.findProofFingerprint(fingerprint);
  const reviewId = makeReviewId(tournament, player, msg.id);
  const ocrSummary = await safeReceiptOcr(msg, media);

  tournamentRepo.markPaymentProof(tournament.code, player.number, {
    reviewId,
    fingerprint,
    ocrSummary,
  });
  tournamentSessionRepo.set(player.number, tournament.code, 'receipt');
  await flushTournament();

  const ownerJid = tournamentOwnerJid(tournament);
  // Deliver the evidence first. If relay fails, no actionable approval context
  // is created; the member can safely retry without an orphaned owner prompt.
  await sock.relayMessage(ownerJid, msg.raw.message!, { messageId: undefined as never });
  const review = await sock.sendMessage(ownerJid, {
    text: [
      `🧾 *PAYMENT REVIEW — ${tournament.code}*`,
      `[VENOM-REVIEW:${reviewId}]`,
      `Player: ${player.nickname}`,
      `Free Fire UID: ${player.freeFireUid}`,
      `WhatsApp: ${player.number}`,
      `Expected amount: ₦${tournament.entryFeeNaira.toLocaleString('en-NG')}`,
      `Expected reference: ${tournament.code}-${player.freeFireUid.slice(-4)}`,
      ...(ocrSummary ? [`OCR assistance (not proof): ${ocrSummary}`] : []),
      ...(duplicate
        ? [`🚩 Duplicate media hash: previously submitted for ${duplicate.tournament.code}/${duplicate.player.nickname}.`]
        : []),
      '',
      '⚠️ Verify the actual credit in your bank app. OCR and screenshots never approve payment.',
      'Reply to this exact message with only *approve* or *reject*.',
      '_Explicit commands remain available as a fallback._',
    ].join('\n'),
  });
  const reviewMessageId = review?.key?.id;
  if (!reviewMessageId) throw new Error('REVIEW_DELIVERY_FAILED');
  tournamentRepo.bindPaymentReviewMessage(tournament.code, player.number, reviewMessageId);
  await flushTournament();

  await reply(
    sock,
    msg,
    '✅ Receipt sent privately to the organizer. Your status remains *pending* until the actual bank credit is verified.',
  );
}

async function handleOwnerReviewReply(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<boolean> {
  if (msg.isGroup || !/^(?:approve|approved|reject|rejected)$/i.test(msg.body.trim())) return false;
  if (!msg.quoted || !isOwner(msg.senderNumber)) return false;
  const reviewId = REVIEW_TOKEN.exec(msg.quoted.body)?.[1];
  if (!reviewId) return false;
  const pending = tournamentRepo.findPendingReview(reviewId);
  if (!pending) {
    await reply(sock, msg, 'ℹ️ That review is no longer pending or could not be found.');
    return true;
  }
  if (
    !pending.player.paymentProofReviewMessageId ||
    msg.quoted.id !== pending.player.paymentProofReviewMessageId
  ) {
    await reply(sock, msg, '🚫 I refused that action because it was not quoted from the exact bot review message.');
    return true;
  }

  const approve = /^approve/i.test(msg.body.trim());
  if (approve) {
    const before = {
      paymentStatus: pending.player.paymentStatus,
      approvedAt: pending.player.approvedAt,
      approvedBy: pending.player.approvedBy,
      rejectedAt: pending.player.rejectedAt,
    };
    const result = tournamentRepo.approvePlayer(
      pending.tournament.code,
      pending.player.number,
      msg.senderNumber,
    );
    tournamentSessionRepo.clear(pending.player.number);
    try {
      await flushTournament();
    } catch (err) {
      Object.assign(result.player, before);
      tournamentRepo.save(result.tournament);
      tournamentSessionRepo.set(pending.player.number, pending.tournament.code, 'receipt');
      await flushTournament().catch(() => {});
      logger.error({ err, reviewId }, 'Owner approval was rolled back after persistence failure');
      await reply(sock, msg, '❌ Approval was not confirmed because durable storage failed. Fix MongoDB, then reply to the review again.');
      return true;
    }
    if (result.changed) {
      await sendPlayerDM(
        sock,
        result.player,
        `✅🏆 *Payment verified — ${pending.tournament.code}*\nYour tournament slot is confirmed. Keep this chat open for check-in and private room details.`,
      );
    }
    try {
      await postRegistrationMilestone(sock, result.tournament);
    } catch (err) {
      logger.warn({ err }, 'Tournament milestone post failed after owner approval');
    }
    const count = tournamentRepo.approvedPlayers(pending.tournament.code).length;
    await reply(sock, msg, `✅ Approved: *${pending.player.nickname}* (${count}/${pending.tournament.maxPlayers}).`);
  } else {
    const before = {
      paymentStatus: pending.player.paymentStatus,
      approvedAt: pending.player.approvedAt,
      approvedBy: pending.player.approvedBy,
      rejectedAt: pending.player.rejectedAt,
      checkedInAt: pending.player.checkedInAt,
    };
    const result = tournamentRepo.rejectPlayer(
      pending.tournament.code,
      pending.player.number,
    );
    tournamentSessionRepo.clear(pending.player.number);
    try {
      await flushTournament();
    } catch (err) {
      Object.assign(result.player, before);
      tournamentRepo.save(result.tournament);
      tournamentSessionRepo.set(pending.player.number, pending.tournament.code, 'receipt');
      await flushTournament().catch(() => {});
      logger.error({ err, reviewId }, 'Owner rejection was rolled back after persistence failure');
      await reply(sock, msg, '❌ Rejection was not confirmed because durable storage failed. Fix MongoDB, then reply to the review again.');
      return true;
    }
    await sendPlayerDM(
      sock,
      result.player,
      `❌ *${pending.tournament.code} registration not verified*\nThe organizer did not confirm this payment. Contact the organizer privately if you believe this is a mistake.`,
    );
    await reply(sock, msg, `✅ Registration rejected for *${pending.player.nickname}*.`);
  }
  return true;
}

function statusMessage(tournament: TournamentModel, player: TournamentPlayer): string {
  const state =
    player.paymentStatus === 'approved'
      ? '✅ Approved — slot confirmed'
      : player.paymentStatus === 'rejected'
        ? '❌ Rejected/not verified'
        : player.paymentProofSubmittedAt
          ? '⏳ Receipt submitted — awaiting organizer review'
          : '⏳ Registered — receipt not submitted';
  return [
    `🏆 *${tournament.code} status*`,
    `Player: *${player.nickname}* · UID: *${player.freeFireUid}*`,
    `Payment: *${state}*`,
    ...(player.checkedInAt ? ['Check-in: *complete*'] : []),
  ].join('\n');
}

/** Natural, command-free tournament registration/payment flow. */
export async function handleNaturalTournament(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<boolean> {
  if (await handleOwnerReviewReply(sock, msg)) return true;
  const text = msg.body.trim();

  if (msg.isGroup) {
    if (!JOIN_INTENT.test(text)) return false;
    const options = openTournaments(msg.chat);
    const tournament = tournamentFromText(text, options) ?? (options.length === 1 ? options[0] : undefined);
    if (!tournament) {
      await reply(
        sock,
        msg,
        options.length
          ? `Which tournament? Include one code: ${options.map((item) => `*${item.code}*`).join(' · ')}`
          : 'There is no tournament currently open for registration in this group.',
      );
      return true;
    }
    if (!tournamentStorageReady()) {
      await reply(sock, msg, '⚠️ Registration is temporarily unavailable because persistent storage is offline.');
      return true;
    }
    await startNaturalRegistration(sock, msg, tournament);
    return true;
  }

  if (STATUS_INTENT.test(text)) {
    const registered = playerTournaments(msg.senderNumber);
    const selected = tournamentFromText(text, registered.map((item) => item.tournament));
    const match = selected
      ? registered.find((item) => item.tournament.code === selected.code)
      : registered[0];
    await reply(sock, msg, match ? statusMessage(match.tournament, match.player) : 'ℹ️ I found no tournament registration for this number.');
    return true;
  }

  const session = tournamentSessionRepo.get(msg.senderNumber);
  const registrations = playerTournaments(msg.senderNumber);
  const captionTournament = tournamentFromText(text);

  if (['imageMessage', 'documentMessage'].includes(msg.type)) {
    const candidates = registrations.filter(
      ({ tournament, player }) =>
        tournament.status === 'registration' && player.paymentStatus === 'pending',
    );
    const selected =
      (captionTournament && candidates.find((item) => item.tournament.code === captionTournament.code)) ||
      (session && candidates.find((item) => item.tournament.code === session.tournamentCode)) ||
      (candidates.length === 1 ? candidates[0] : undefined);
    if (!selected) {
      await reply(
        sock,
        msg,
        candidates.length > 1
          ? `Add the tournament code to the receipt caption: ${candidates.map((item) => item.tournament.code).join(' · ')}`
          : 'I could not match this receipt to a pending registration. Ask to join the tournament first.',
      );
      return true;
    }
    try {
      await submitTournamentReceipt(sock, msg, selected.tournament, selected.player);
    } catch (err) {
      logger.warn({ err }, 'Natural tournament receipt workflow failed');
      await reply(
        sock,
        msg,
        `❌ ${tournamentErrorMessage(err)}\nYour payment was *not* auto-approved. Please retry or contact the organizer.`,
      );
    }
    return true;
  }

  if (JOIN_INTENT.test(text) || /^\s*i want to join\b/i.test(text)) {
    if (!tournamentStorageReady()) {
      await reply(sock, msg, '⚠️ Registration is temporarily unavailable because persistent storage is offline.');
      return true;
    }
    const options = openTournaments();
    const tournament = tournamentFromText(text, options) ?? (options.length === 1 ? options[0] : undefined);
    if (!tournament) {
      await reply(
        sock,
        msg,
        options.length
          ? `Please include the tournament code: ${options.map((item) => `*${item.code}*`).join(' · ')}`
          : 'There is no tournament currently open for registration.',
      );
      return true;
    }
    const existing = tournamentRepo.findPlayer(tournament.code, msg.senderNumber);
    if (existing) {
      tournamentSessionRepo.set(msg.senderNumber, tournament.code, 'receipt');
      await flushTournament();
      await reply(sock, msg, statusMessage(tournament, existing));
      if (existing.paymentStatus === 'pending' && !existing.paymentProofSubmittedAt) {
        await reply(sock, msg, paymentMessage(tournament, existing));
      }
      return true;
    }
    const details = parseNaturalTournamentDetails(text);
    if (details.nickname && details.freeFireUid) {
      try {
        await saveNaturalRegistration(sock, msg, tournament, details.nickname, details.freeFireUid);
      } catch (err) {
        await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
      }
    } else {
      await startNaturalRegistration(sock, msg, tournament);
    }
    return true;
  }

  if (session?.stage === 'details') {
    const tournament = tournamentRepo.get(session.tournamentCode);
    if (!tournament) {
      tournamentSessionRepo.clear(msg.senderNumber);
      return false;
    }
    const details = parseNaturalTournamentDetails(text);
    if (!details.nickname || !details.freeFireUid) {
      // Do not interrupt unrelated private conversation; only engage when one
      // registration field or a registration cue is present.
      if (!details.nickname && !details.freeFireUid && !/\b(?:nickname|ign|uid)\b/i.test(text)) return false;
      await reply(sock, msg, `I still need both the *nickname* and *UID*.\n\n${registrationPrompt(tournament)}`);
      return true;
    }
    try {
      await saveNaturalRegistration(sock, msg, tournament, details.nickname, details.freeFireUid);
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
    return true;
  }

  return false;
}
