import { createCollection } from '../index';
import type { GroupModel } from '../models/group.model';

const groups = createCollection<GroupModel>('groups');

function defaults(jid: string): GroupModel {
  return {
    jid,
    welcome: false,
    goodbye: false,
    antilink: false,
    antispam: false,
    antitag: false,
    antibot: false,
    antiword: false,
    bannedWords: [],
    mutedUsers: [],
    createdAt: Date.now(),
  };
}

export const groupRepo = {
  get(jid: string): GroupModel | undefined {
    const g = groups.get(jid);
    if (!g) return undefined;
    // Backfill new fields on older records.
    return { ...defaults(jid), ...g };
  },

  ensure(jid: string): GroupModel {
    const existing = groups.get(jid);
    if (existing) return { ...defaults(jid), ...existing };
    const created = defaults(jid);
    groups.set(jid, created);
    return created;
  },

  setFlag(jid: string, flag: keyof GroupModel, value: boolean): void {
    const g = this.ensure(jid);
    (g as any)[flag] = value;
    groups.set(jid, g);
  },

  setWelcome(jid: string, on: boolean): void {
    this.setFlag(jid, 'welcome', on);
  },
  setGoodbye(jid: string, on: boolean): void {
    this.setFlag(jid, 'goodbye', on);
  },
  setAntilink(jid: string, on: boolean): void {
    this.setFlag(jid, 'antilink', on);
  },

  addBannedWord(jid: string, word: string): void {
    const g = this.ensure(jid);
    if (!g.bannedWords.includes(word.toLowerCase())) {
      g.bannedWords.push(word.toLowerCase());
      groups.set(jid, g);
    }
  },
  removeBannedWord(jid: string, word: string): void {
    const g = this.ensure(jid);
    g.bannedWords = g.bannedWords.filter((w) => w !== word.toLowerCase());
    groups.set(jid, g);
  },

  muteUser(jid: string, number: string): void {
    const g = this.ensure(jid);
    if (!g.mutedUsers.includes(number)) {
      g.mutedUsers.push(number);
      groups.set(jid, g);
    }
  },
  unmuteUser(jid: string, number: string): void {
    const g = this.ensure(jid);
    g.mutedUsers = g.mutedUsers.filter((n) => n !== number);
    groups.set(jid, g);
  },
  isUserMuted(jid: string, number: string): boolean {
    return this.get(jid)?.mutedUsers.includes(number) ?? false;
  },
};
