import { createCollection } from '../index';

interface AfkModel extends Record<string, unknown> {
  number: string;
  reason: string;
  since: number;
}

const afk = createCollection<AfkModel>('afk');

export const afkRepo = {
  set(number: string, reason: string): void {
    afk.set(number, { number, reason, since: Date.now() });
  },
  get(number: string): AfkModel | undefined {
    return afk.get(number);
  },
  clear(number: string): void {
    afk.delete(number);
  },
  isAfk(number: string): boolean {
    return Boolean(afk.get(number));
  },
};
