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
  private max = 2000;

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
}

export const msgCache = new MessageCache();
