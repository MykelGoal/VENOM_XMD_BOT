/**
 * Optional encrypted memory sync — makes AI conversation memory survive
 * redeploys on ephemeral free hosts (Render free wipes the disk on every
 * deploy; local chatmemory.json dies with it).
 *
 * Opt-in via MEMORY_URL (unset = local-only memory, the default):
 *   MEMORY_URL=mantle:auto  → MantleDB namespace derived from SESSION_ID
 *   MEMORY_URL=mantle:<ns>  → explicit namespace
 *   MEMORY_SHARDS=N         → spread chats over N namespaces (capacity ×N)
 *
 * MantleDB (mantledb.sh) is free with NO signup — but it's a third party,
 * so every payload is AES-256-GCM encrypted with a key derived from the
 * bot's own SESSION_ID before it leaves the host. The server only ever
 * stores ciphertext; if it disappears or blocks us, the bot silently
 * continues with local-only memory (never blocks a chat).
 *
 * Free-tier limits we design around: 100 entries per namespace, 64KB per
 * entry, 10k requests/day → we sync only the ~100 most-active chats, only
 * when they actually changed (~1 entry ≈ 7KB).
 */
import crypto from 'crypto';
import axios from 'axios';
import { env } from '../config';
import { logger } from '../utils/logger';
import { chatMemoryRepo, ChatTurn } from '../database/repositories/chatmemory.repo';

const BASE_URL = 'https://mantledb.sh';
const SYNC_INTERVAL_MS = 3 * 60 * 1000; // flush dirty chats every 3 minutes
const MAX_REMOTE_CHATS = 100; // MantleDB free: 100 entries per namespace
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

interface MemoryTarget {
  /** Namespace base (shard suffix added per chat when MEMORY_SHARDS > 1). */
  base: string;
}

/** Parse MEMORY_URL. Returns null when sync is off or the URL is unknown. */
export function parseMemoryTarget(): MemoryTarget | null {
  const raw = env.memory.syncUrl.trim();
  if (!raw) return null;
  const m = raw.match(/^mantle:(.+)$/i);
  if (!m) {
    logger.warn(`MEMORY_URL not understood ("${raw}") — use mantle:auto or mantle:<namespace>. Sync disabled.`);
    return null;
  }
  const spec = m[1].trim();
  const base =
    spec === 'auto'
      ? 'venom-' + crypto.createHash('sha256').update(env.session.id).digest('hex').slice(0, 24)
      : spec.replace(/[^a-zA-Z0-9_-]/g, '-');
  return { base };
}

/** True when remote memory sync is configured. */
export function memorySyncEnabled(): boolean {
  return parseMemoryTarget() !== null;
}

/** Which shard namespace a chat lives in (stable, hash-based). */
function shardNamespace(t: MemoryTarget, chat: string): string {
  if (env.memory.shards <= 1) return t.base;
  let h = 0;
  for (const c of chat) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `${t.base}-s${h % env.memory.shards}`;
}

/** URL-safe, collision-free path for a chat JID. */
function pathFor(chat: string): string {
  const h = crypto.createHash('sha1').update(chat).digest('hex').slice(0, 8);
  const safe = chat.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 40);
  return `c/${safe}-${h}`;
}

/* ─── AES-256-GCM: the storage provider only ever sees ciphertext ─── */

function memoryKey(): Buffer {
  // Key derived from the bot's own SESSION_ID — no new secrets to manage.
  return crypto.createHash('sha256').update('venom-mem:' + env.session.id).digest();
}

/** Encrypt a memory snapshot → opaque base64 blob. (Exported for tests.) */
export function encryptMemory(data: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', memoryKey(), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, ct, cipher.getAuthTag()]).toString('base64');
}

/** Decrypt a blob produced by encryptMemory. (Exported for tests.) */
export function decryptMemory(blob: string): unknown {
  const raw = Buffer.from(blob, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const ct = raw.subarray(12, raw.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', memoryKey(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8'));
}

interface Snapshot {
  chat: string;
  messages: ChatTurn[];
  updatedAt: number;
}

async function api<T>(method: 'get' | 'post' | 'delete', url: string, body?: unknown): Promise<T> {
  const { data } = await axios.request<T>({
    method,
    url,
    data: body,
    headers: { 'User-Agent': UA, 'Content-Type': 'application/json' },
    timeout: 15_000,
  });
  return data;
}

/* ─── Flush (local → remote, only what changed) ─── */

const lastSynced = new Map<string, number>(); // chat → updatedAt at last successful push

async function flush(target: MemoryTarget): Promise<void> {
  const chats = chatMemoryRepo.active(MAX_REMOTE_CHATS);
  for (const c of chats) {
    if (lastSynced.get(c.chat) === c.updatedAt) continue; // unchanged — skip
    const snapshot: Snapshot = { chat: c.chat, messages: c.messages, updatedAt: c.updatedAt };
    await api('post', `${BASE_URL}/v2/${shardNamespace(target, c.chat)}/${pathFor(c.chat)}`, {
      v: 1,
      d: encryptMemory(snapshot),
    });
    lastSynced.set(c.chat, c.updatedAt);
  }
}

/* ─── Hydrate (remote → local, on boot; remote wins only if newer) ─── */

async function hydrate(target: MemoryTarget): Promise<void> {
  const shardCount = Math.max(1, env.memory.shards);
  const namespaces = Array.from({ length: shardCount }, (_, i) =>
    shardCount > 1 ? `${target.base}-s${i}` : target.base,
  );

  let restored = 0;
  for (const ns of namespaces) {
    try {
      const list = await api<{ entries?: Array<{ path?: string }> }>(
        'get',
        `${BASE_URL}/v2/list/${ns}`,
      );
      for (const e of list?.entries ?? []) {
        if (!e.path?.startsWith('c/')) continue;
        try {
          const entry = await api<{ d?: string }>('get', `${BASE_URL}/v2/${ns}/${e.path}`);
          if (!entry?.d) continue;
          const snap = decryptMemory(entry.d) as Snapshot;
          if (snap?.chat && Array.isArray(snap.messages)) {
            chatMemoryRepo.hydrate(snap.chat, snap.messages, snap.updatedAt ?? 0);
            restored++;
          }
        } catch {
          /* one bad entry (e.g. from an old SESSION_ID) — skip it */
        }
      }
    } catch {
      /* namespace not reachable/empty yet — fine on first boot */
    }
  }
  if (restored > 0) logger.info(`🧠 Memory sync: restored ${restored} chat(s) from remote store`);
}

/* ─── Remote deletion (so "forget" really forgets) ─── */

/** Delete one chat's entry from the remote store (best-effort, never throws). */
export async function forgetRemote(chat: string): Promise<void> {
  const target = parseMemoryTarget();
  if (!target) return;
  lastSynced.delete(chat);
  try {
    await api('delete', `${BASE_URL}/v2/${shardNamespace(target, chat)}/${pathFor(chat)}`);
  } catch {
    /* entry already gone or store unreachable — local clear still stands */
  }
}

/** Delete EVERY memory entry from the remote store (owner wipe, best-effort). */
export async function wipeRemoteAll(): Promise<void> {
  const target = parseMemoryTarget();
  if (!target) return;
  const shardCount = Math.max(1, env.memory.shards);
  for (let i = 0; i < shardCount; i++) {
    const ns = shardCount > 1 ? `${target.base}-s${i}` : target.base;
    try {
      const list = await api<{ entries?: Array<{ path?: string }> }>('get', `${BASE_URL}/v2/list/${ns}`);
      for (const e of list?.entries ?? []) {
        if (!e.path?.startsWith('c/')) continue;
        try {
          await api('delete', `${BASE_URL}/v2/${ns}/${e.path}`);
        } catch { /* skip */ }
      }
    } catch { /* namespace unreachable — skip */ }
  }
  lastSynced.clear();
}

/* ─── Lifecycle ─── */

let started = false;

/** Boot hook: hydrate from remote, then flush dirty chats on an interval. */
export function startMemorySync(): void {
  const target = parseMemoryTarget();
  if (!target || started) return;
  started = true;

  logger.info(
    `🧠 Memory sync ON (namespace "${target.base.slice(0, 12)}•••"${env.memory.shards > 1 ? `, ${env.memory.shards} shards` : ''}, AES-256 encrypted)`,
  );

  hydrate(target).catch((err) => logger.warn({ err }, 'memory hydrate failed (continuing local-only)'));

  const timer = setInterval(() => {
    flush(target).catch((err) => logger.warn({ err }, 'memory flush failed (will retry next cycle)'));
  }, SYNC_INTERVAL_MS);
  timer.unref?.();
}

/** Force an immediate flush (used by tests / manual triggers). */
export function flushNow(): Promise<void> {
  const target = parseMemoryTarget();
  if (!target) return Promise.resolve();
  return flush(target);
}

/** Force an immediate hydrate (used by tests / manual triggers). */
export function hydrateNow(): Promise<void> {
  const target = parseMemoryTarget();
  if (!target) return Promise.resolve();
  return hydrate(target);
}
