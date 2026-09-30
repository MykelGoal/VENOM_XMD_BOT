import { createCollection } from '../index';
import type {
  TournamentConversationStage,
  TournamentSessionModel,
} from '../models/tournament-session.model';
import { normalizeTournamentCode } from './tournament.repo';

const sessions = createCollection<TournamentSessionModel>('tournament_sessions');
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const digits = (value: string) => value.replace(/\D/g, '');

export const tournamentSessionRepo = {
  get(number: string, at = Date.now()): TournamentSessionModel | undefined {
    const key = digits(number);
    const session = sessions.get(key);
    if (session && session.expiresAt <= at) {
      sessions.delete(key);
      return undefined;
    }
    return session;
  },

  set(
    number: string,
    tournamentCode: string,
    stage: TournamentConversationStage,
    at = Date.now(),
  ): TournamentSessionModel {
    const key = digits(number);
    const current = sessions.get(key);
    const session: TournamentSessionModel = {
      number: key,
      tournamentCode: normalizeTournamentCode(tournamentCode),
      stage,
      createdAt: current?.createdAt ?? at,
      updatedAt: at,
      expiresAt: at + SESSION_TTL_MS,
    };
    sessions.set(key, session);
    return session;
  },

  clear(number: string): void {
    sessions.delete(digits(number));
  },

  cleanup(at = Date.now()): number {
    let removed = 0;
    for (const session of sessions.all()) {
      if (session.expiresAt <= at) {
        sessions.delete(session.number);
        removed++;
      }
    }
    return removed;
  },
};
