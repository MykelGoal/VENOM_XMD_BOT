export type TournamentStatus =
  | 'registration'
  | 'checkin'
  | 'running'
  | 'finished'
  | 'cancelled';

export type TournamentPaymentStatus = 'pending' | 'approved' | 'rejected';

export interface TournamentRoundScore {
  round: number;
  kills: number;
  placement: number;
  placementPoints: number;
  totalPoints: number;
  recordedAt: number;
}

export interface TournamentPlayer {
  /** WhatsApp phone-number identity, normalized to digits. */
  number: string;
  /** Best JID for private replies. */
  jid: string;
  /** Best group-addressing JID for winner mentions (may be a LID). */
  groupJid?: string;
  nickname: string;
  freeFireUid: string;
  paymentStatus: TournamentPaymentStatus;
  joinedAt: number;
  approvedAt?: number;
  approvedBy?: string;
  rejectedAt?: number;
  paymentProofSubmittedAt?: number;
  /** Opaque id printed in the bot's private owner review summary. */
  paymentProofReviewId?: string;
  /** Exact WhatsApp id of that bot-authored summary; quote replies bind to it. */
  paymentProofReviewMessageId?: string;
  /** SHA-256 only; receipt media itself is not retained by the bot. */
  paymentProofFingerprint?: string;
  /** Bounded, non-authoritative visible fields extracted from the receipt. */
  paymentProofOcrSummary?: string;
  checkedInAt?: number;
  rounds: TournamentRoundScore[];
}

export interface TournamentPrizes {
  first: number;
  second: number;
  third: number;
}

export interface TournamentModel extends Record<string, unknown> {
  code: string;
  game: 'Free Fire';
  groupJid: string;
  groupName: string;
  eventDate: string;
  paymentInstructions: string;
  maxPlayers: number;
  entryFeeNaira: number;
  prizes: TournamentPrizes;
  status: TournamentStatus;
  createdByJid: string;
  createdByDmJid: string;
  createdByNumber: string;
  participants: TournamentPlayer[];
  announcedMilestones: number[];
  announcementSentAt?: number;
  reminderEnabled: boolean;
  reminderTime: string;
  lastReminderDate?: string;
  checkinOpenedAt?: number;
  roomSentRounds: number[];
  standingsPostedRounds: number[];
  completedRounds: number[];
  finalPostedAt?: number;
  createdAt: number;
  updatedAt: number;
}
