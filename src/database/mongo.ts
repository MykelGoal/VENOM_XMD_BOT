import { MongoClient } from 'mongodb';
import { env } from '../config';
import { logger } from '../utils/logger';

/**
 * Optional MongoDB persistence for MONEY records.
 *
 * Why: hosts like Render (free tier) wipe the filesystem on every
 * redeploy — local JSON wallets would vanish along with people's money.
 *
 * How (write-behind mirror, zero changes to the sync repo API):
 *   • The JSON collections stay the working store (repos stay synchronous).
 *   • When MONGO_URI is set, every write to the mirrored collections is
 *     queued IN ORDER and upserted to Mongo.
 *   • On boot the mirrored collections are hydrated FROM Mongo (replacing
 *     local state), so a redeploy can never wipe a wallet. If Mongo is
 *     empty but local files have records (owner just added MONGO_URI),
 *     local data is SEEDED up to Mongo instead of being wiped.
 *   • Money-critical paths call flushMongo() before sending receipts, so
 *     "delivered" always implies "recorded".
 *
 * Money collections only — sessions/keys/chat-memory already have their
 * own persistence (SESSION_ID, host env vars, MEMORY_URL).
 */

const MIRRORED = ['wallets', 'walletledger', 'vtupending'];

let client: MongoClient | null = null;
let db: ReturnType<MongoClient['db']> | null = null;
let enabled = false;

/** In-order write queue — keeps Mongo consistent with the JSON store. */
let chain: Promise<void> = Promise.resolve();

export function isMongoEnabled(): boolean {
  return enabled;
}

/** Connect if MONGO_URI is set. Never throws — falls back to local JSON. */
export async function initMongo(): Promise<void> {
  const uri = env.storage.mongoUri.trim();
  if (!uri) {
    logger.info(
      '🗄️  MONGO_URI not set — money records live in local files only. ' +
        '(Fine locally; on hosts that wipe the disk (Render free), set MONGO_URI or wallets reset on redeploy.)',
    );
    return;
  }
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8_000 });
    await client.connect();
    db = client.db(env.storage.mongoDb.trim() || 'venomxmd');
    await db.command({ ping: 1 });
    enabled = true;
    logger.info('🗄️  MongoDB connected — wallets & money records are redeploy-proof.');
  } catch (err) {
    client = null;
    db = null;
    enabled = false;
    logger.warn(
      { err },
      'MongoDB connection failed — continuing with local JSON storage. ' +
        'Fix MONGO_URI to make wallets survive redeploys.',
    );
  }
}

function mirroredCollection(name: string) {
  if (!enabled || !db || !MIRRORED.includes(name)) return null;
  return db.collection(name);
}

/** Queue an upsert for a JSON write (no-op unless Mongo is on). */
export function mirrorSet(name: string, key: string, doc: unknown): void {
  const coll = mirroredCollection(name);
  if (!coll) return;
  chain = chain
    .then(() =>
      coll.replaceOne(
        { _id: key as never },
        { ...(doc as Record<string, unknown>), _id: key } as never,
        { upsert: true },
      ),
    )
    .catch((err) => logger.warn({ err }, `mongo mirror write failed: ${name}/${key}`))
    .then(() => undefined);
}

/** Queue a delete for a JSON delete (no-op unless Mongo is on). */
export function mirrorDelete(name: string, key: string): void {
  const coll = mirroredCollection(name);
  if (!coll) return;
  chain = chain
    .then(() => coll.deleteOne({ _id: key as never }))
    .catch((err) => logger.warn({ err }, `mongo mirror delete failed: ${name}/${key}`))
    .then(() => undefined);
}

/** Resolves when every queued mirror write has landed in Mongo. */
export function flushMongo(): Promise<void> {
  return chain;
}

/**
 * Pull the mirrored collections from Mongo into the JSON store.
 * Call ONCE at boot, before anything touches the wallets.
 */
export async function hydrateMirroredCollections(): Promise<void> {
  if (!enabled || !db) return;
  // Late import: database/index imports this module for the mirror hooks.
  const { hydrateCollection } = await import('./index');
  for (const name of MIRRORED) {
    try {
      const docs = await db.collection(name).find({}).toArray();
      const map: Record<string, unknown> = {};
      for (const d of docs) {
        const { _id, ...rest } = d as { _id: unknown };
        map[String(_id)] = rest;
      }
      const result = hydrateCollection(name, map);
      if (result === 'seeded') {
        logger.info(`🗄️  Seeded Mongo collection "${name}" from local records.`);
      }
    } catch (err) {
      logger.warn({ err }, `mongo hydration failed for "${name}" — using local file`);
    }
  }
}
