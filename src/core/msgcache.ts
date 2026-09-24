import type { proto } from '@whiskeysockets/baileys';

interface CachedMessage {
  raw: proto.IWebMessageInfo;
  sender: string;
  chat: string;
  at: number;
}

/**
 * Small LRU-ish cache of recent messages, used by anti-delete to recover
 * a message after it's deleted. Capped to avoid unbounded memory growth.
 */
class MessageCache {
  private map = new Map<string, CachedMessage>();
  private moderatedDeletes = new Map<string, number>();
  private max = 2000;
  private moderationTtlMs = 2 * 60 * 1000;

  set(id: string, entry: CachedMessage): void {
    if (this.map.size >= this.max) {
      // Delete the oldest inserted key.
      const first = this.map.keys().next().value;
      if (first) this.map.delete(first);
    }
    this.map.set(id, entry);
  }

  get(id: string): CachedMessage | undefined {
    return this.map.get(id);
  }

  /** Mark a message that the bot itself is about to delete for moderation. */
  suppressAntiDelete(id: string): void {
    this.pruneModeratedDeletes();
    this.moderatedDeletes.set(id, Date.now() + this.moderationTtlMs);
  }

  /** Remove the marker if the moderation deletion itself failed. */
  unsuppressAntiDelete(id: string): void {
    this.moderatedDeletes.delete(id);
  }

  /**
   * Consume a moderation marker so anti-delete does not immediately restore a
   * message that anti-link/mute deliberately removed.
   */
  consumeAntiDeleteSuppression(id: string): boolean {
    const expires = this.moderatedDeletes.get(id);
    if (!expires) return false;
    this.moderatedDeletes.delete(id);
    return expires > Date.now();
  }

  private pruneModeratedDeletes(): void {
    const now = Date.now();
    for (const [id, expires] of this.moderatedDeletes) {
      if (expires <= now) this.moderatedDeletes.delete(id);
    }
  }
}

export const msgCache = new MessageCache();
