import { createCollection } from '../index';

interface WarnModel extends Record<string, unknown> {
  /** key = `${groupJid}:${number}` */
  key: string;
  groupJid: string;
  number: string;
  count: number;
  reasons: string[];
}

const warns = createCollection<WarnModel>('warns');

function keyFor(groupJid: string, number: string): string {
  return `${groupJid}:${number}`;
}

export const warnRepo = {
  add(groupJid: string, number: string, reason: string): number {
    const key = keyFor(groupJid, number);
    const existing = warns.get(key);
    const model: WarnModel = existing ?? {
      key,
      groupJid,
      number,
      count: 0,
      reasons: [],
    };
    model.count += 1;
    model.reasons.push(reason || 'No reason');
    warns.set(key, model);
    return model.count;
  },
  get(groupJid: string, number: string): WarnModel | undefined {
    return warns.get(keyFor(groupJid, number));
  },
  reset(groupJid: string, number: string): void {
    warns.delete(keyFor(groupJid, number));
  },
  count(groupJid: string, number: string): number {
    return warns.get(keyFor(groupJid, number))?.count ?? 0;
  },
};
