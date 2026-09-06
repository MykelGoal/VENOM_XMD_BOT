import fs from 'fs';
import path from 'path';
import { PATHS } from '../config';
import { logger } from '../utils/logger';

const DB_DIR = path.join(PATHS.root, 'database-store');

/**
 * Tiny JSON-file "database". Each collection is one .json file.
 * This is intentionally simple and dependency-free so the bot runs
 * out of the box. Swap this module for SQLite/Mongo later without
 * touching the repositories' public API.
 */
class JsonDB<T extends Record<string, unknown>> {
  private file: string;
  private data: Record<string, T> = {};

  constructor(collection: string) {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    this.file = path.join(DB_DIR, `${collection}.json`);
    this.load();
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
  }

  update(id: string, patch: Partial<T>): T {
    const current = this.data[id] ?? ({} as T);
    const next = { ...current, ...patch } as T;
    this.data[id] = next;
    this.persist();
    return next;
  }

  delete(id: string): void {
    delete this.data[id];
    this.persist();
  }

  all(): T[] {
    return Object.values(this.data);
  }
}

export function createCollection<T extends Record<string, unknown>>(
  name: string,
): JsonDB<T> {
  return new JsonDB<T>(name);
}
