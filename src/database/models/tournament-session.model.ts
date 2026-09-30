export type TournamentConversationStage = 'details' | 'receipt';

/** Short-lived natural-language handoff; financial/tournament records live elsewhere. */
export interface TournamentSessionModel extends Record<string, unknown> {
  /** WhatsApp phone number, normalized to digits. */
  number: string;
  tournamentCode: string;
  stage: TournamentConversationStage;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}
