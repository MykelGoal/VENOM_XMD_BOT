import { createCollection } from '../index';

interface ActivityDay {
  messages: number;
  media: number;
}

export interface MemberActivity extends Record<string, unknown> {
  /** Composite key: `${groupJid}|${number}`. */
  key: string;
  group: string;
  number: string;
  /** Total non-bot messages seen from this member in this group. */
  count: number;
  /** Messages useful for activity reports (commands/spam excluded). */
  meaningfulCount: number;
  /** Last time this member sent a message here. */
  lastSeen: number;
  /** Small rolling aggregate; raw message text is never stored here. */
  daily: Record<string, ActivityDay>;
}

export interface GroupActivitySummary {
  days: number;
  meaningfulMessages: number;
  mediaMessages: number;
  uniqueActive: number;
  highlyActive: number;
  active: number;
  light: number;
  peakDate?: string;
  peakMessages: number;
  previousMessages: number;
  changePct?: number;
}

const store = createCollection<MemberActivity>('groupstats');
const RETENTION_DAYS = 120;

const keyOf = (group: string, number: string) => `${group}|${number}`;

export function lagosActivityDateKey(at = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(at));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function dateKeys(days: number, at = Date.now(), offsetDays = 0): Set<string> {
  const keys = new Set<string>();
  for (let i = offsetDays; i < offsetDays + days; i++) {
    keys.add(lagosActivityDateKey(at - i * 86_400_000));
  }
  return keys;
}

function normalized(existing: MemberActivity | undefined, group: string, number: string): MemberActivity {
  return {
    key: existing?.key ?? keyOf(group, number),
    group,
    number,
    count: Number(existing?.count ?? 0),
    // Legacy totals mixed commands with chat; never relabel them as meaningful.
    meaningfulCount: Number(existing?.meaningfulCount ?? 0),
    lastSeen: Number(existing?.lastSeen ?? 0),
    daily: existing?.daily && typeof existing.daily === 'object' ? existing.daily : {},
  };
}

function windowCounts(member: MemberActivity, keys: Set<string>): { messages: number; media: number; activeDays: number } {
  let messages = 0;
  let media = 0;
  let activeDays = 0;
  for (const key of keys) {
    const day = member.daily[key];
    if (!day?.messages) continue;
    messages += day.messages;
    media += day.media ?? 0;
    activeDays++;
  }
  return { messages, media, activeDays };
}

/**
 * Per-group member activity. It stores numerical daily aggregates, never raw
 * conversations. Bot messages never reach this repository.
 */
export const groupStatsRepo = {
  record(
    group: string,
    number: string,
    options: { meaningful?: boolean; media?: boolean; at?: number } = {},
  ): void {
    const at = options.at ?? Date.now();
    const meaningful = options.meaningful ?? true;
    const current = normalized(store.get(keyOf(group, number)), group, number);
    current.count++;
    current.lastSeen = at;

    if (meaningful) {
      current.meaningfulCount++;
      const today = lagosActivityDateKey(at);
      const day = current.daily[today] ?? { messages: 0, media: 0 };
      day.messages++;
      if (options.media) day.media++;
      current.daily[today] = day;
    }

    const keep = dateKeys(RETENTION_DAYS, at);
    for (const key of Object.keys(current.daily)) {
      if (!keep.has(key)) delete current.daily[key];
    }
    store.set(current.key, current);
  },

  forGroup(group: string): MemberActivity[] {
    return store
      .all()
      .filter((member) => member.group === group)
      .map((member) => normalized(member, member.group, member.number));
  },

  top(group: string, n = 10): MemberActivity[] {
    return this.forGroup(group)
      .sort((a, b) => b.meaningfulCount - a.meaningfulCount)
      .slice(0, n);
  },

  member(group: string, number: string): MemberActivity | undefined {
    const found = store.get(keyOf(group, number));
    return found ? normalized(found, group, number) : undefined;
  },

  totalMessages(group: string): number {
    return this.forGroup(group).reduce((sum, member) => sum + member.count, 0);
  },

  lastGroupActivity(group: string): number {
    return Math.max(0, ...this.forGroup(group).map((member) => member.lastSeen));
  },

  summary(group: string, days = 7, at = Date.now()): GroupActivitySummary {
    const safeDays = Math.max(1, Math.min(90, Math.floor(days)));
    const currentKeys = dateKeys(safeDays, at);
    const previousKeys = dateKeys(safeDays, at, safeDays);
    const members = this.forGroup(group);
    let meaningfulMessages = 0;
    let mediaMessages = 0;
    let previousMessages = 0;
    let highlyActive = 0;
    let active = 0;
    let light = 0;
    const perDate = new Map<string, number>();

    for (const member of members) {
      const current = windowCounts(member, currentKeys);
      const previous = windowCounts(member, previousKeys);
      meaningfulMessages += current.messages;
      mediaMessages += current.media;
      previousMessages += previous.messages;
      if (current.messages === 0) continue;
      if (current.activeDays >= 4 || current.messages >= 20) highlyActive++;
      else if (current.activeDays >= 2 || current.messages >= 5) active++;
      else light++;
      for (const key of currentKeys) {
        perDate.set(key, (perDate.get(key) ?? 0) + (member.daily[key]?.messages ?? 0));
      }
    }

    const peak = [...perDate.entries()].sort((a, b) => b[1] - a[1])[0];
    const changePct = previousMessages
      ? Math.round(((meaningfulMessages - previousMessages) / previousMessages) * 100)
      : undefined;
    return {
      days: safeDays,
      meaningfulMessages,
      mediaMessages,
      uniqueActive: highlyActive + active + light,
      highlyActive,
      active,
      light,
      peakDate: peak?.[0],
      peakMessages: peak?.[1] ?? 0,
      previousMessages,
      changePct,
    };
  },

  dailyTotal(group: string, date: string): number {
    return this.forGroup(group).reduce(
      (sum, member) => sum + (member.daily[date]?.messages ?? 0),
      0,
    );
  },

  reset(group: string): void {
    for (const member of this.forGroup(group)) store.delete(member.key);
  },
};

export function isMeaningfulActivity(body: string, type: string, prefix = '.'): boolean {
  const text = body.trim();
  if (text.startsWith(prefix)) return false;
  if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(type)) {
    return true;
  }
  if (!text) return false;
  const compact = text.replace(/\s+/g, '');
  if (compact.length < 2) return false;
  // Repeated-character floods and emoji-only reactions should not inflate stats.
  if (/^(.)\1{5,}$/u.test(compact)) return false;
  if (!/[\p{L}\p{N}]/u.test(compact)) return false;
  return true;
}
