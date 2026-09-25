import type { WASocket } from '@whiskeysockets/baileys';
import { tournamentRepo } from '../database/repositories/tournament.repo';
import {
  flushTournament,
  sendTournamentDailyReminder,
} from './tournament.service';
import { logger } from '../utils/logger';

const CHECK_INTERVAL_MS = 30_000;
const DELIVERY_WINDOW_MINUTES = 2 * 60;
const LAGOS_TIME_ZONE = 'Africa/Lagos';

let reminderTimer: NodeJS.Timeout | undefined;
let reminderTickRunning = false;

interface LagosClock {
  date: string;
  minutes: number;
}

export function lagosClock(now = new Date()): LagosClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LAGOS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const hour = Number(value('hour'));
  const minute = Number(value('minute'));
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    minutes: hour * 60 + minute,
  };
}

function timeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/** Run one reminder scan; exported for deterministic tests. */
export async function runTournamentReminderTick(
  sock: WASocket,
  now = new Date(),
): Promise<number> {
  const clock = lagosClock(now);
  let posted = 0;

  for (const tournament of tournamentRepo.all()) {
    // Missing reminder fields mean the record predates this feature; use defaults.
    if (tournament.reminderEnabled === false || tournament.status !== 'registration') {
      continue;
    }
    if (tournament.lastReminderDate === clock.date) continue;
    const target = timeToMinutes(tournament.reminderTime || '18:00');
    if (target === null) continue;
    if (
      clock.minutes < target ||
      clock.minutes >= target + DELIVERY_WINDOW_MINUTES
    ) {
      continue;
    }

    try {
      const sent = await sendTournamentDailyReminder(sock, tournament);
      if (!sent) continue;
      tournamentRepo.markReminderSent(tournament.code, clock.date);
      await flushTournament();
      posted += 1;
    } catch (err) {
      logger.warn(
        { err, tournament: tournament.code },
        'Tournament daily reminder failed',
      );
    }
  }
  return posted;
}

/** Start one reconnect-safe scheduler using Lagos time. */
export function startTournamentReminderLoop(sock: WASocket): void {
  if (reminderTimer) clearInterval(reminderTimer);
  const tick = async () => {
    if (reminderTickRunning) return;
    reminderTickRunning = true;
    try {
      await runTournamentReminderTick(sock);
    } finally {
      reminderTickRunning = false;
    }
  };
  void tick();
  reminderTimer = setInterval(() => void tick(), CHECK_INTERVAL_MS);
}
