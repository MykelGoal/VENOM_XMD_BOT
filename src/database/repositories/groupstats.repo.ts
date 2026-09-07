import { createCollection } from '../index';

interface MemberActivity extends Record<string, unknown> {
  /** Composite key: `${groupJid}|${number}`. */
  key: string;
  group: string;
  number: string;
  /** Total messages seen from this member in this group. */
  count: number;
  /** Last time this member sent a message here. */
  lastSeen: number;
}

const store = createCollection<MemberActivity>('groupstats');

const keyOf = (group: string, number: string) => `${group}|${number}`;

/**
 * Per-group, per-member message activity. Powers group stats, the leaderboard
 * of most active members, and inactive-member detection.
 */
export const groupStatsRepo = {
  /** Record one message from a member in a group. */
  record(group: string, number: string): void {
    const key = keyOf(group, number);
    const existing = store.get(key);
    if (existing) {
      store.update(key, { count: existing.count + 1, lastSeen: Date.now() });
    } else {
      store.set(key, { key, group, number, count: 1, lastSeen: Date.now() });
    }
  },

  /** All activity records for a group. */
  forGroup(group: string): MemberActivity[] {
    return store.all().filter((m) => m.group === group);
  },

  /** Top-N most active members of a group. */
  top(group: string, n = 10): MemberActivity[] {
    return this.forGroup(group)
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  },

  /** Activity record for one member (undefined if never seen). */
  member(group: string, number: string): MemberActivity | undefined {
    return store.get(keyOf(group, number));
  },

  /** Total messages tracked in a group. */
  totalMessages(group: string): number {
    return this.forGroup(group).reduce((sum, m) => sum + m.count, 0);
  },

  /** Reset all stats for a group. */
  reset(group: string): void {
    for (const m of this.forGroup(group)) store.delete(m.key);
  },
};
