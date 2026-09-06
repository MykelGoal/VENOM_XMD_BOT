import { createCollection } from '../index';
import type { GroupModel } from '../models/group.model';

const groups = createCollection<GroupModel>('groups');

export const groupRepo = {
  get(jid: string): GroupModel | undefined {
    return groups.get(jid);
  },

  ensure(jid: string): GroupModel {
    const existing = groups.get(jid);
    if (existing) return existing;
    const created: GroupModel = {
      jid,
      welcome: false,
      antilink: false,
      createdAt: Date.now(),
    };
    groups.set(jid, created);
    return created;
  },

  setWelcome(jid: string, on: boolean): void {
    this.ensure(jid);
    groups.update(jid, { welcome: on });
  },

  setAntilink(jid: string, on: boolean): void {
    this.ensure(jid);
    groups.update(jid, { antilink: on });
  },
};
