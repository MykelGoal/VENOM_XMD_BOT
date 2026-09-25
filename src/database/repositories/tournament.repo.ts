import { createCollection } from '../index';
import type {
  TournamentModel,
  TournamentPlayer,
  TournamentRoundScore,
} from '../models/tournament.model';

const tournaments = createCollection<TournamentModel>('tournaments');

export interface RankedTournamentPlayer {
  player: TournamentPlayer;
  totalPoints: number;
  totalKills: number;
  wins: number;
  finalPlacement: number;
}

export function normalizeTournamentCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

function normalizeIdentity(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `234${digits.slice(1)}`;
  }
  return digits;
}

function save(tournament: TournamentModel): TournamentModel {
  tournament.updatedAt = Date.now();
  tournaments.set(tournament.code, tournament);
  return tournament;
}

function getRequired(code: string): TournamentModel {
  const tournament = tournamentRepo.get(code);
  if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
  return tournament;
}

export const tournamentRepo = {
  get(code: string): TournamentModel | undefined {
    return tournaments.get(normalizeTournamentCode(code));
  },

  all(): TournamentModel[] {
    return tournaments.all();
  },

  create(input: {
    code: string;
    groupJid: string;
    groupName: string;
    eventDate: string;
    paymentInstructions: string;
    createdByJid: string;
    createdByDmJid: string;
    createdByNumber: string;
  }): TournamentModel {
    const code = normalizeTournamentCode(input.code);
    if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
      throw new Error('INVALID_TOURNAMENT_CODE');
    }
    if (tournaments.get(code)) throw new Error('TOURNAMENT_EXISTS');

    const now = Date.now();
    const tournament: TournamentModel = {
      code,
      game: 'Free Fire',
      groupJid: input.groupJid,
      groupName: input.groupName,
      eventDate: input.eventDate,
      paymentInstructions: input.paymentInstructions,
      maxPlayers: 40,
      entryFeeNaira: 1000,
      prizes: { first: 25000, second: 10000, third: 5000 },
      status: 'registration',
      createdByJid: input.createdByJid,
      createdByDmJid: input.createdByDmJid,
      createdByNumber: normalizeIdentity(input.createdByNumber),
      participants: [],
      announcedMilestones: [],
      reminderEnabled: true,
      reminderTime: '18:00',
      roomSentRounds: [],
      standingsPostedRounds: [],
      completedRounds: [],
      createdAt: now,
      updatedAt: now,
    };
    tournaments.set(code, tournament);
    return tournament;
  },

  save,

  addPlayer(
    code: string,
    input: {
      number: string;
      jid: string;
      groupJid?: string;
      nickname: string;
      freeFireUid: string;
    },
  ): TournamentPlayer {
    const tournament = getRequired(code);
    if (tournament.status !== 'registration') {
      throw new Error('REGISTRATION_CLOSED');
    }
    if (
      tournament.participants.filter((entry) => entry.paymentStatus === 'approved')
        .length >= tournament.maxPlayers
    ) {
      throw new Error('TOURNAMENT_FULL');
    }

    const number = normalizeIdentity(input.number);
    const duplicate = tournament.participants.find(
      (player) =>
        player.number === number || player.freeFireUid === input.freeFireUid,
    );
    if (duplicate) throw new Error('ALREADY_REGISTERED');

    const player: TournamentPlayer = {
      number,
      jid: input.jid,
      groupJid: input.groupJid,
      nickname: input.nickname.trim(),
      freeFireUid: input.freeFireUid,
      paymentStatus: 'pending',
      joinedAt: Date.now(),
      rounds: [],
    };
    tournament.participants.push(player);
    save(tournament);
    return player;
  },

  findPlayer(code: string, identity: string): TournamentPlayer | undefined {
    const tournament = tournamentRepo.get(code);
    if (!tournament) return undefined;
    const normalized = normalizeIdentity(identity);
    return tournament.participants.find(
      (player) =>
        player.freeFireUid === identity ||
        player.number === normalized ||
        player.jid === identity ||
        player.groupJid === identity,
    );
  },

  approvePlayer(
    code: string,
    identity: string,
    approvedBy: string,
  ): { tournament: TournamentModel; player: TournamentPlayer; changed: boolean } {
    const tournament = getRequired(code);
    if (tournament.status !== 'registration') {
      throw new Error('REGISTRATION_CLOSED');
    }
    const player = tournamentRepo.findPlayer(code, identity);
    if (!player) throw new Error('PLAYER_NOT_FOUND');
    if (player.paymentStatus === 'approved') {
      return { tournament, player, changed: false };
    }
    if (
      tournament.participants.filter((entry) => entry.paymentStatus === 'approved')
        .length >= tournament.maxPlayers
    ) {
      throw new Error('TOURNAMENT_FULL');
    }

    player.paymentStatus = 'approved';
    player.approvedAt = Date.now();
    player.approvedBy = normalizeIdentity(approvedBy);
    player.rejectedAt = undefined;
    save(tournament);
    return { tournament, player, changed: true };
  },

  rejectPlayer(
    code: string,
    identity: string,
  ): { tournament: TournamentModel; player: TournamentPlayer } {
    const tournament = getRequired(code);
    if (tournament.status !== 'registration') {
      throw new Error('REGISTRATION_CLOSED');
    }
    const player = tournamentRepo.findPlayer(code, identity);
    if (!player) throw new Error('PLAYER_NOT_FOUND');
    player.paymentStatus = 'rejected';
    player.rejectedAt = Date.now();
    player.approvedAt = undefined;
    player.approvedBy = undefined;
    player.checkedInAt = undefined;
    save(tournament);
    return { tournament, player };
  },

  markPaymentProof(
    code: string,
    identity: string,
  ): { tournament: TournamentModel; player: TournamentPlayer } {
    const tournament = getRequired(code);
    const player = tournamentRepo.findPlayer(code, identity);
    if (!player) throw new Error('PLAYER_NOT_FOUND');
    if (player.paymentStatus !== 'pending') {
      throw new Error('PAYMENT_NOT_PENDING');
    }
    player.paymentProofSubmittedAt = Date.now();
    save(tournament);
    return { tournament, player };
  },

  approvedPlayers(code: string): TournamentPlayer[] {
    return (
      tournamentRepo
        .get(code)
        ?.participants.filter((player) => player.paymentStatus === 'approved') ?? []
    );
  },

  openCheckin(code: string): TournamentModel {
    const tournament = getRequired(code);
    if (tournament.status === 'finished' || tournament.status === 'cancelled') {
      throw new Error('TOURNAMENT_CLOSED');
    }
    tournament.status = 'checkin';
    tournament.checkinOpenedAt ??= Date.now();
    return save(tournament);
  },

  checkInPlayer(
    code: string,
    identity: string,
  ): { tournament: TournamentModel; player: TournamentPlayer; changed: boolean } {
    const tournament = getRequired(code);
    if (!['checkin', 'running'].includes(tournament.status)) {
      throw new Error('CHECKIN_CLOSED');
    }
    const player = tournamentRepo.findPlayer(code, identity);
    if (!player || player.paymentStatus !== 'approved') {
      throw new Error('PLAYER_NOT_APPROVED');
    }
    if (player.checkedInAt) return { tournament, player, changed: false };
    player.checkedInAt = Date.now();
    save(tournament);
    return { tournament, player, changed: true };
  },

  recordRound(
    code: string,
    round: number,
    results: Array<{
      freeFireUid: string;
      kills: number;
      placement: number;
      placementPoints: number;
    }>,
  ): TournamentModel {
    const tournament = getRequired(code);
    if (tournament.status === 'finished' || tournament.status === 'cancelled') {
      throw new Error('TOURNAMENT_CLOSED');
    }

    // Resolve every UID before mutating anything so one bad row cannot leave
    // a partially-applied round in the in-memory store.
    const resolved = results.map((result) => {
      const player = tournament.participants.find(
        (entry) =>
          entry.freeFireUid === result.freeFireUid &&
          entry.paymentStatus === 'approved',
      );
      if (!player) throw new Error(`UNKNOWN_UID:${result.freeFireUid}`);
      return { result, player };
    });

    for (const { result, player } of resolved) {
      const score: TournamentRoundScore = {
        round,
        kills: result.kills,
        placement: result.placement,
        placementPoints: result.placementPoints,
        totalPoints: result.kills + result.placementPoints,
        recordedAt: Date.now(),
      };
      const existing = player.rounds.findIndex((entry) => entry.round === round);
      if (existing >= 0) player.rounds[existing] = score;
      else player.rounds.push(score);
    }

    tournament.status = 'running';
    if (!tournament.completedRounds.includes(round)) {
      tournament.completedRounds.push(round);
      tournament.completedRounds.sort((a, b) => a - b);
    }
    // A corrected round may need a corrected standings post.
    tournament.standingsPostedRounds = tournament.standingsPostedRounds.filter(
      (entry) => entry !== round,
    );
    return save(tournament);
  },

  ranking(code: string): RankedTournamentPlayer[] {
    const tournament = getRequired(code);
    const latestRound = Math.max(0, ...tournament.completedRounds);
    return tournament.participants
      .filter((player) => player.paymentStatus === 'approved')
      .map((player) => {
        const totalPoints = player.rounds.reduce(
          (sum, round) => sum + round.totalPoints,
          0,
        );
        const totalKills = player.rounds.reduce(
          (sum, round) => sum + round.kills,
          0,
        );
        const wins = player.rounds.filter((round) => round.placement === 1).length;
        const finalPlacement =
          player.rounds.find((round) => round.round === latestRound)?.placement ??
          Number.MAX_SAFE_INTEGER;
        return { player, totalPoints, totalKills, wins, finalPlacement };
      })
      .sort(
        (a, b) =>
          b.totalPoints - a.totalPoints ||
          b.wins - a.wins ||
          b.totalKills - a.totalKills ||
          a.finalPlacement - b.finalPlacement ||
          a.player.joinedAt - b.player.joinedAt,
      );
  },

  markMilestone(code: string, count: number): TournamentModel {
    const tournament = getRequired(code);
    if (!tournament.announcedMilestones.includes(count)) {
      tournament.announcedMilestones.push(count);
    }
    return save(tournament);
  },

  markAnnouncementSent(code: string): TournamentModel {
    const tournament = getRequired(code);
    tournament.announcementSentAt = Date.now();
    return save(tournament);
  },

  configureReminder(
    code: string,
    enabled: boolean,
    time = '18:00',
  ): TournamentModel {
    const tournament = getRequired(code);
    tournament.reminderEnabled = enabled;
    tournament.reminderTime = time;
    if (!enabled) tournament.lastReminderDate = undefined;
    return save(tournament);
  },

  markReminderSent(code: string, date: string): TournamentModel {
    const tournament = getRequired(code);
    tournament.lastReminderDate = date;
    return save(tournament);
  },

  markRoomSent(code: string, round: number): TournamentModel {
    const tournament = getRequired(code);
    if (!tournament.roomSentRounds.includes(round)) {
      tournament.roomSentRounds.push(round);
    }
    tournament.status = 'running';
    return save(tournament);
  },

  markStandingsPosted(code: string, round: number): TournamentModel {
    const tournament = getRequired(code);
    if (!tournament.standingsPostedRounds.includes(round)) {
      tournament.standingsPostedRounds.push(round);
    }
    return save(tournament);
  },

  markFinished(code: string): TournamentModel {
    const tournament = getRequired(code);
    tournament.status = 'finished';
    tournament.finalPostedAt = Date.now();
    return save(tournament);
  },
};
