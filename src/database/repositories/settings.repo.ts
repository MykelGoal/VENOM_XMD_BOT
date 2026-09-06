import { createCollection } from '../index';

interface KV extends Record<string, unknown> {
  key: string;
  value: string;
}

const store = createCollection<KV>('settings');

/**
 * Global key-value settings store (setvar/getvar) and typed helpers for
 * bot-wide toggles (mode, autotyping, rejectcall, antidelete, etc.).
 */
export const settingsRepo = {
  set(key: string, value: string): void {
    store.set(key.toLowerCase(), { key: key.toLowerCase(), value });
  },
  get(key: string): string | undefined {
    return store.get(key.toLowerCase())?.value;
  },
  delete(key: string): boolean {
    if (!store.get(key.toLowerCase())) return false;
    store.delete(key.toLowerCase());
    return true;
  },
  all(): KV[] {
    return store.all();
  },

  /** Boolean toggle helpers. */
  getBool(key: string, fallback = false): boolean {
    const v = this.get(key);
    if (v === undefined) return fallback;
    return v === 'true';
  },
  setBool(key: string, on: boolean): void {
    this.set(key, on ? 'true' : 'false');
  },
};
