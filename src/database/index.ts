import fs from 'fs';
import path from 'path';
import { PATHS } from '../config';
import { logger } from '../utils/logger';
import { mirrorSet, mirrorDelete } from './mongo';

/** Override is used by automated tests so they never touch production data. */
const DB_DIR = process.env.VENOM_DATA_DIR
  ? path.resolve(process.env.VENOM_DATA_DIR)
  : path.join(PATHS.root, 'database-store');

/** Activity/settings writes can be coalesced; money records remain immediate. */
const WRITE_DELAY_MS = 75;
const DURABLE_COLLECTIONS = new Set([
  'wallets',
  'walletledger',
  'vtupending',
]);

/** Registry of live collections (Mongo hydration and graceful shutdown). */
const registry = new Map<string, JsonDB<never>>();

/**
 * Hydrate one collection from Mongo at boot.
 *   • Mongo has docs → replace local state with them (redeploy-proof).
 *   • Mongo empty but local file has records → seed Mongo from local.
 */
export function hydrateCollection(
  name: string,
  docs: Record<string, unknown>,
): 'hydrated' | 'seeded' | 'missing' {
  const coll = registry.get(name);
  if (!coll) return 'missing';
  const remoteCount = Object.keys(docs).length;
  const local = coll.snapshot();
  const localCount = Object.keys(local).length;
  if (remoteCount === 0) {
    if (localCount > 0) {
      for (const [key, value] of Object.entries(local)) {
        mirrorSet(name, key, value);
      }
      return 'seeded';
    }
    return 'hydrated';
  }
  coll.replaceAll(docs as Record<string, never>);
  return 'hydrated';
}

/** Flush every pending local JSON write synchronously before process exit. */
export function flushLocalCollections(): void {
  for (const collection of registry.values()) collection.flush();
}

/**
 * Small JSON-file database behind repository interfaces.
 *
 * Non-critical rapid writes are coalesced into one atomic file replacement,
 * preventing per-message stats from repeatedly blocking the event loop.
 * Wallet/payment collections still flush synchronously on every mutation.
 */
class JsonDB<T extends Record<string, unknown>> {
  private readonly file: string;
  private readonly name: string;
  private data: Record<string, T> = {};
  private dirty = false;
  private persistTimer: NodeJS.Timeout | null = null;

  constructor(collection: string) {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    this.name = collection;
    this.file = path.join(DB_DIR, `${collection}.json`);
    this.load();
  }

  /** Raw view of the store (boot-time hydration/mirroring only). */
  snapshot(): Record<string, T> {
    return { ...this.data };
  }

  /** Replace all content (boot-time hydration from Mongo). */
  replaceAll(docs: Record<string, T>): void {
    this.data = docs;
    this.persist();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.file)) {
        this.data = JSON.parse(fs.readFileSync(this.file, 'utf-8'));
      }
    } catch (err) {
      logger.error({ err }, `Failed to load DB file ${this.file}`);
      this.data = {};
    }
  }

  /** Queue a coalesced write, except for money-critical collections. */
  private persist(): void {
    this.dirty = true;
    if (DURABLE_COLLECTIONS.has(this.name)) {
      this.flush();
      return;
    }
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => this.flush(), WRITE_DELAY_MS);
  }

  /** Atomically replace the file so a crash cannot leave partial JSON. */
  flush(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (!this.dirty) return;

    const temporary = `${this.file}.${process.pid}.tmp`;
    try {
      fs.mkdirSync(DB_DIR, { recursive: true });
      fs.writeFileSync(temporary, JSON.stringify(this.data, null, 2));
      fs.renameSync(temporary, this.file);
      this.dirty = false;
    } catch (err) {
      logger.error({ err }, `Failed to persist DB file ${this.file}`);
      try {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      } catch {
        // Best-effort cleanup; preserve the original persistence error above.
      }
    }
  }

  get(id: string): T | undefined {
    return this.data[id];
  }

  set(id: string, value: T): void {
    this.data[id] = value;
    this.persist();
    mirrorSet(this.name, id, value);
  }

  update(id: string, patch: Partial<T>): T {
    const current = this.data[id] ?? ({} as T);
    const next = { ...current, ...patch } as T;
    this.data[id] = next;
    this.persist();
    mirrorSet(this.name, id, next);
    return next;
  }

  delete(id: string): void {
    delete this.data[id];
    this.persist();
    mirrorDelete(this.name, id);
  }

  all(): T[] {
    return Object.values(this.data);
  }
}

export function createCollection<T extends Record<string, unknown>>(
  name: string,
): JsonDB<T> {
  const collection = new JsonDB<T>(name);
  registry.set(name, collection as unknown as JsonDB<never>);
  return collection;
}
