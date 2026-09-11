import fs from 'fs';
import path from 'path';
import { PATHS } from '../config';
import { logger } from '../utils/logger';
import { mirrorSet, mirrorDelete } from './mongo';

const DB_DIR = path.join(PATHS.root, 'database-store');

/** Registry of live collections (for boot-time Mongo hydration). */
const registry = new Map<string, JsonDB<never>>();

/**
 * Hydrate one collection from Mongo at boot.
 *   • Mongo has docs → replace local state with them (redeploy-proof).
 *   • Mongo empty but local file has records → seed Mongo from local
 *     (adding MONGO_URI must never wipe existing wallets).
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
      for (const [k, v] of Object.entries(local)) mirrorSet(name, k, v);
      return 'seeded';
    }
    return 'hydrated'; // both empty — nothing to do
  }
  coll.replaceAll(docs as Record<string, never>);
  return 'hydrated';
}

/**
 * Tiny JSON-file "database". Each collection is one .json file.
 * This is intentionally simple and dependency-free so the bot runs
 * out of the box. Swap this module for SQLite/Mongo later without
 * touching the repositories' public API.
 */
class JsonDB<T extends Record<string, unknown>> {
  private file: string;
  private name: string;
  private data: Record<string, T> = {};

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

  private persist(): void {
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
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
  const coll = new JsonDB<T>(name);
  registry.set(name, coll as unknown as JsonDB<never>);
  return coll;
}
