/**
 * Minimal in-memory store.
 *
 * Baileys' built-in makeInMemoryStore was deprecated/removed in newer
 * versions, so we keep a tiny cache of group metadata to avoid hammering
 * the server on every group message. Extend as needed.
 */
import type { GroupMetadata } from '@whiskeysockets/baileys';

class Store {
  private groupCache = new Map<string, { data: GroupMetadata; at: number }>();
  private ttlMs = 5 * 60 * 1000; // 5 minutes

  getGroup(jid: string): GroupMetadata | undefined {
    const entry = this.groupCache.get(jid);
    if (!entry) return undefined;
    if (Date.now() - entry.at > this.ttlMs) {
      this.groupCache.delete(jid);
      return undefined;
    }
    return entry.data;
  }

  setGroup(jid: string, data: GroupMetadata): void {
    this.groupCache.set(jid, { data, at: Date.now() });
  }

  clearGroup(jid: string): void {
    this.groupCache.delete(jid);
  }
}

export const store = new Store();
