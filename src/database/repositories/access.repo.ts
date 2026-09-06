import { createCollection } from '../index';

interface AccessEntry extends Record<string, unknown> {
  number: string;
  role: 'sudo' | 'mod';
}

const store = createCollection<AccessEntry>('access');

/**
 * Manages sudo users (near-owner privileges) and mods (elevated helpers).
 */
export const accessRepo = {
  add(number: string, role: 'sudo' | 'mod'): void {
    store.set(`${role}:${number}`, { number, role });
  },
  remove(number: string, role: 'sudo' | 'mod'): boolean {
    if (!store.get(`${role}:${number}`)) return false;
    store.delete(`${role}:${number}`);
    return true;
  },
  is(number: string, role: 'sudo' | 'mod'): boolean {
    return Boolean(store.get(`${role}:${number}`));
  },
  list(role: 'sudo' | 'mod'): string[] {
    return store
      .all()
      .filter((e) => e.role === role)
      .map((e) => e.number);
  },
};
