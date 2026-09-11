import { createCollection } from '../index';

/**
 * Bounded per-chat AI conversation memory.
 *
 * The bot remembers the last few turns of each AI-mode conversation so it
 * chats like a human instead of amnesia-per-message. Everything is capped
 * so the store can never bloat a free host:
 *   • 16 messages per chat  (8 turns)
 *   • 400 chars per message (novels don't fit in memory — human or bot)
 *   • 24h TTL               (yesterday fades, like a person)
 *   • 400 chats max         (quietest chats are forgotten first — LRU)
 */

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  at: number;
}

interface ChatMemory extends Record<string, unknown> {
  chat: string;
  messages: ChatTurn[];
  updatedAt: number;
}

const store = createCollection<ChatMemory>('chatmemory');

const MAX_CHATS = 400;
const MAX_MESSAGES = 16;
const MAX_CHARS = 400;
const TTL_MS = 24 * 60 * 60 * 1000;

/** Drop expired turns from one chat's message list. */
function fresh(turns: ChatTurn[]): ChatTurn[] {
  return turns.filter((t) => Date.now() - t.at < TTL_MS);
}

/** Evict the quietest chats when the store exceeds MAX_CHATS. */
function sweep(): void {
  const chats = store.all().sort((a, b) => b.updatedAt - a.updatedAt);
  for (const stale of chats.slice(MAX_CHATS)) store.delete(stale.chat);
}

export const chatMemoryRepo = {
  /** Recent turns for a chat (TTL-filtered, oldest → newest). */
  history(chat: string): Array<Pick<ChatTurn, 'role' | 'content'>> {
    const mem = store.get(chat);
    if (!mem) return [];
    const turns = fresh(mem.messages ?? []);
    if (turns.length !== mem.messages.length) {
      if (turns.length) store.update(chat, { messages: turns });
      else store.delete(chat);
    }
    return turns.map(({ role, content }) => ({ role, content }));
  },

  /** Store one conversation turn (user prompt + bot answer). */
  record(chat: string, user: string, assistant: string): void {
    const now = Date.now();
    const prev = store.get(chat);
    const messages = fresh(prev?.messages ?? []);
    messages.push(
      { role: 'user', content: user.slice(0, MAX_CHARS), at: now },
      { role: 'assistant', content: assistant.slice(0, MAX_CHARS), at: now },
    );
    store.set(chat, {
      chat,
      messages: messages.slice(-MAX_MESSAGES),
      updatedAt: now,
    });
    if (store.all().length > MAX_CHATS) sweep();
  },

  /** Wipe a chat's memory. Returns true when something was forgotten. */
  clear(chat: string): boolean {
    if (!store.get(chat)) return false;
    store.delete(chat);
    return true;
  },

  /** The most recently updated chats (for remote sync — top N active). */
  active(limit: number): ChatMemory[] {
    return store
      .all()
      .filter((m) => fresh(m.messages ?? []).length > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  },

  /**
   * Hydrate a chat from a remote sync snapshot. Remote wins only when it is
   * newer than what we have locally (a redeploy may be older than nothing).
   */
  hydrate(chat: string, messages: ChatTurn[], updatedAt: number): void {
    const local = store.get(chat);
    if (local && local.updatedAt >= updatedAt) return;
    const turns = fresh(messages).slice(-MAX_MESSAGES);
    if (!turns.length) return;
    store.set(chat, { chat, messages: turns, updatedAt });
  },
};
