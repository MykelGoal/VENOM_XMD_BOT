import { createCollection } from '../index';
import type { UserModel } from '../models/user.model';

const users = createCollection<UserModel>('users');

export const userRepo = {
  get(number: string): UserModel | undefined {
    return users.get(number);
  },

  ensure(number: string, name?: string): UserModel {
    const existing = users.get(number);
    if (existing) return existing;
    const created: UserModel = {
      number,
      name,
      banned: false,
      commandCount: 0,
      firstSeen: Date.now(),
    };
    users.set(number, created);
    return created;
  },

  ban(number: string): void {
    this.ensure(number);
    users.update(number, { banned: true });
  },

  unban(number: string): void {
    this.ensure(number);
    users.update(number, { banned: false });
  },

  incrementCommands(number: string): void {
    const user = this.ensure(number);
    users.update(number, { commandCount: user.commandCount + 1 });
  },

  all(): UserModel[] {
    return users.all();
  },
};
