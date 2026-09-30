import type { WASocket } from '@whiskeysockets/baileys';
import { env } from '../config';
import { groupBrainRepo } from '../database/repositories/groupbrain.repo';
import {
  groupStatsRepo,
  lagosActivityDateKey,
} from '../database/repositories/groupstats.repo';
import { tournamentRepo } from '../database/repositories/tournament.repo';
import { tournamentSessionRepo } from '../database/repositories/tournament-session.repo';
import { flushMongo } from '../database/mongo';
import { getGroupMetadata } from './group.service';
import { renderActivityCard } from './report-card.service';
import { numberToJid } from '../utils/helpers';
import { logger } from '../utils/logger';

const CHECK_INTERVAL_MS = 60_000;
const ENGAGEMENT_QUIET_MS = 3 * 60 * 60_000;
let timer: NodeJS.Timeout | undefined;
let running = false;

interface CommunityClock {
  date: string;
  minutes: number;
  weekday: string;
}

function clockAt(now: Date): CommunityClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
    weekday: part('weekday'),
  };
}

function introductionsSince(jid: string, since: number): number {
  return Object.values(groupBrainRepo.get(jid)?.members ?? {}).filter(
    (member) => (member.intro?.submittedAt ?? 0) >= since,
  ).length;
}

function pendingReceipts(jid: string): number {
  return tournamentRepo
    .all()
    .filter((tournament) => tournament.groupJid === jid)
    .flatMap((tournament) => tournament.participants)
    .filter(
      (player) =>
        player.paymentStatus === 'pending' && Boolean(player.paymentProofSubmittedAt),
    ).length;
}

function eventEffects(jid: string, since: number, at: number): string[] {
  const brain = groupBrainRepo.get(jid);
  if (!brain) return [];
  return brain.events
    .filter((event) => event.startsAt >= since && event.startsAt <= at)
    .slice(-3)
    .map((event) => {
      const eventDate = lagosActivityDateKey(event.startsAt);
      const priorDate = lagosActivityDateKey(event.startsAt - 86_400_000);
      const onEvent = groupStatsRepo.dailyTotal(jid, eventDate);
      const before = groupStatsRepo.dailyTotal(jid, priorDate);
      return `• ${event.title}: ${onEvent} event-day messages vs ${before} the prior day`;
    });
}

async function ownerJid(): Promise<string | undefined> {
  return env.ownerNumbers[0] ? numberToJid(env.ownerNumbers[0]) : undefined;
}

async function sendOwnerDigest(sock: WASocket, weekly: boolean, at: number): Promise<string[]> {
  const owner = await ownerJid();
  if (!owner) return [];
  const reportDate = clockAt(new Date(at)).date;
  const brains = groupBrainRepo.all().filter((brain) =>
    weekly
      ? brain.communityManagerEnabled &&
        brain.weeklyActivityEnabled &&
        brain.lastWeeklyActivityDate !== reportDate
      : brain.communityManagerEnabled &&
        brain.ownerDigestEnabled &&
        brain.lastOwnerDigestDate !== reportDate,
  );
  if (!brains.length) return [];

  const days = weekly ? 7 : 1;
  const since = at - days * 86_400_000;
  const sections: string[] = [];
  const completedJids: string[] = [];
  const cards: Array<{ name: string; image: Buffer }> = [];

  for (const brain of brains) {
    try {
      const meta = await getGroupMetadata(sock, brain.jid);
      const summary = groupStatsRepo.summary(brain.jid, days, at);
      const introCount = introductionsSince(brain.jid, since);
      const onboarding = groupBrainRepo.onboardingCounts(brain.jid);
      const newMembers = Object.values(brain.members ?? {}).filter(
        (member) => !member.leftAt && member.joinedAt >= since,
      ).length;
      const quiet = Math.max(0, meta.participants.length - summary.uniqueActive);
      const trend = summary.changePct === undefined
        ? 'new baseline'
        : `${summary.changePct >= 0 ? '+' : ''}${summary.changePct}% vs previous ${days}d`;
      const effects = weekly ? eventEffects(brain.jid, since, at) : [];
      sections.push([
        `*${meta.subject}*`,
        `• ${summary.meaningfulMessages} meaningful messages · ${trend}`,
        `• ${summary.highlyActive} highly active · ${summary.active} active · ${summary.light} light`,
        `• ${quiet} quiet (no meaningful post in window) · ${newMembers} new (may overlap activity)`, 
        `• Peak: ${summary.peakDate ?? 'none'} (${summary.peakMessages})`,
        `• Introductions: ${introCount} new · ${onboarding.completed}/${onboarding.tracked} complete`,
        `• Payment receipts awaiting decision: ${pendingReceipts(brain.jid)}`,
        ...(effects.length ? ['• Event-day comparison:', ...effects] : []),
      ].join('\n'));
      if (weekly) {
        cards.push({
          name: meta.subject,
          image: await renderActivityCard({
            groupName: meta.subject,
            memberCount: meta.participants.length,
            introductions: onboarding.completed,
            summary,
          }),
        });
      }
      completedJids.push(brain.jid);
    } catch (err) {
      logger.warn({ err, group: brain.jid }, 'Could not build owner community digest section');
    }
  }
  if (!sections.length) return [];

  await sock.sendMessage(owner, {
    text: [
      weekly ? '📊 *WEEKLY COMMUNITY INTELLIGENCE*' : '🧭 *DAILY COMMUNITY BRIEF*',
      `_Private owner report · ${clockAt(new Date(at)).date}_`,
      '',
      sections.join('\n\n'),
      '',
      '_Counts exclude commands, bot output, reminders, welcomes and system events. “Quiet/new” does not claim message reads or hidden last-seen data._',
    ].join('\n'),
  });
  for (const card of cards) {
    await sock.sendMessage(owner, {
      image: card.image,
      caption: `📊 ${card.name} — verified ${days}-day aggregate`,
    });
  }
  return completedJids;
}

async function sendEngagement(sock: WASocket, jid: string, index: number): Promise<void> {
  const item = index % 5;
  if (item === 0) {
    await sock.sendMessage(jid, {
      poll: {
        name: '🎮 What should our next Free Fire session focus on?',
        values: ['BR room', 'Clash Squad', 'Training/sensitivity', 'Rank push'],
        selectableCount: 1,
      },
    });
    return;
  }
  if (item === 1) {
    await sock.sendMessage(jid, {
      poll: {
        name: '🧠 Free Fire quick trivia: which item revives a knocked teammate faster?',
        values: ['Treatment Gun', 'Inhaler', 'Med Kit', 'Repair Kit'],
        selectableCount: 1,
      },
    });
    return;
  }
  if (item === 2) {
    await sock.sendMessage(jid, {
      poll: {
        name: '🔥 Room interest check — when are you most likely to play?',
        values: ['Tonight', 'Tomorrow evening', 'Weekend', 'Just spectating'],
        selectableCount: 1,
      },
    });
    return;
  }
  if (item === 3) {
    await sock.sendMessage(jid, {
      text: '🎯 *Low-pressure challenge:* share one movement or aim habit that improved your gameplay. Keep it short so others can test it.',
    });
    return;
  }
  await sock.sendMessage(jid, {
    text: '💬 *Squad discussion:* what makes a good teammate in a tense final zone — aim, communication, positioning or calm decisions? Give one practical reason.',
  });
}

async function alertWorkflowFailure(sock: WASocket, detail: string): Promise<void> {
  const owner = await ownerJid();
  if (!owner) return;
  await sock.sendMessage(owner, { text: `⚠️ *Community workflow failure*\n${detail}` }).catch(() => {});
}

/** One deterministic community-manager scan, exported for tests. */
export async function runCommunityManagerTick(
  sock: WASocket,
  now = new Date(),
): Promise<{ engagements: number; reports: number }> {
  const clock = clockAt(now);
  const at = now.getTime();
  let engagements = 0;
  let reports = 0;

  // Temporary workflows expire; normalized profiles and ledgers are untouched.
  tournamentSessionRepo.cleanup(at);
  for (const brain of groupBrainRepo.all()) groupBrainRepo.cleanupDepartedMembers(brain.jid, at);

  // Three low-spam activity days; quiet hours are hard-coded by this narrow window.
  const engagementDay = ['Tue', 'Thu', 'Sat'].includes(clock.weekday);
  if (engagementDay && clock.minutes >= 16 * 60 && clock.minutes < 18 * 60) {
    for (const brain of groupBrainRepo.all()) {
      if (!brain.communityManagerEnabled || !brain.engagementEnabled) continue;
      if (brain.lastEngagementDate === clock.date) continue;
      const lastActivity = groupStatsRepo.lastGroupActivity(brain.jid);
      if (lastActivity && at - lastActivity < ENGAGEMENT_QUIET_MS) continue; // group is already lively
      try {
        await sendEngagement(sock, brain.jid, brain.engagementIndex ?? 0);
        groupBrainRepo.markCommunityRun(brain.jid, 'engagement', clock.date);
        await flushMongo();
        engagements++;
      } catch (err) {
        logger.warn({ err, group: brain.jid }, 'Adaptive community activity failed');
        await alertWorkflowFailure(sock, `Could not post the scheduled activity in ${brain.jid}.`);
      }
    }
  }

  const weeklyDue = clock.weekday === 'Sun' && clock.minutes >= 20 * 60 + 30 && clock.minutes < 23 * 60;
  if (weeklyDue) {
    const due = groupBrainRepo.all().filter(
      (brain) =>
        brain.communityManagerEnabled &&
        brain.weeklyActivityEnabled &&
        brain.lastWeeklyActivityDate !== clock.date,
    );
    if (due.length) {
      try {
        const delivered = await sendOwnerDigest(sock, true, at);
        reports += delivered.length;
        for (const jid of delivered) groupBrainRepo.markCommunityRun(jid, 'weekly', clock.date);
        await flushMongo();
      } catch (err) {
        logger.warn({ err }, 'Weekly community intelligence delivery failed');
      }
    }
  }

  // Sunday weekly intelligence replaces the daily brief to avoid duplicate owner spam.
  const dailyDue = clock.weekday !== 'Sun' && clock.minutes >= 21 * 60 && clock.minutes < 23 * 60;
  if (dailyDue) {
    const due = groupBrainRepo.all().filter(
      (brain) =>
        brain.communityManagerEnabled &&
        brain.ownerDigestEnabled &&
        brain.lastOwnerDigestDate !== clock.date,
    );
    if (due.length) {
      try {
        const delivered = await sendOwnerDigest(sock, false, at);
        reports += delivered.length;
        for (const jid of delivered) groupBrainRepo.markCommunityRun(jid, 'digest', clock.date);
        await flushMongo();
      } catch (err) {
        logger.warn({ err }, 'Daily owner community brief delivery failed');
      }
    }
  }

  return { engagements, reports };
}

export function startCommunityManagerLoop(sock: WASocket): void {
  if (timer) clearInterval(timer);
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runCommunityManagerTick(sock);
    } finally {
      running = false;
    }
  };
  void tick();
  timer = setInterval(() => void tick(), CHECK_INTERVAL_MS);
  timer.unref?.();
}
