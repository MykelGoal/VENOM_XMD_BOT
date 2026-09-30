import { MongoClient } from 'mongodb';
import { env } from '../config';
import { logger } from '../utils/logger';

/**
 * Optional MongoDB persistence for durable bot records.
 *
 * Why: hosts like Render (free tier) wipe the filesystem on every redeploy.
 * Group settings, access lists, user data, wallets and live tournament state
 * must survive that.
 *
 * How (write-behind mirror, zero changes to the sync repo API):
 *   • The JSON collections stay the working store (repos stay synchronous).
 *   • When MONGO_URI is set, every write to the mirrored collections is
 *     queued IN ORDER and upserted to Mongo.
 *   • On boot the mirrored collections are hydrated FROM Mongo (replacing
 *     local state), so a redeploy can never wipe a wallet. If Mongo is
 *     empty but local files have records (owner just added MONGO_URI),
 *     local data is SEEDED up to Mongo instead of being wiped.
 *   • Critical paths call flushMongo() before confirming success, so
 *     "confirmed" means the durable write queue has completed.
 *
 * WhatsApp sessions and bounded AI chat memory retain dedicated persistence.
 */

const MIRRORED = [
  'access',
  'afk',
  'economy',
  'groups',
  'groupbrains',
  'groupstats',
  'notes',
  'settings',
  'tournaments',
  'tournament_sessions',
  'users',
  'voiceclones',
  'wallets',
  'walletledger',
  'vtupending',
  'warns',
];

let client: MongoClient | null = null;
let db: ReturnType<MongoClient['db']> | null = null;
let enabled = false;

/** In-order write queue — keeps Mongo consistent with the JSON store. */
let chain: Promise<void> = Promise.resolve();
/** Most recent mirror error, surfaced by flushMongo() to critical callers. */
let mirrorFailure: Error | null = null;

export function isMongoEnabled(): boolean {
  return enabled;
}

/** Read an application-encrypted private blob. Never mirrored to local JSON. */
export async function readPrivateState(key: string): Promise<Record<string, unknown> | null> {
  if (!enabled || !db) return null;
  const doc = await db.collection('private_state').findOne({ _id: key as never });
  if (!doc) return null;
  const value = { ...doc } as Record<string, unknown>;
  delete value._id;
  return value;
}

/** Store an application-encrypted private blob directly in MongoDB. */
export async function writePrivateState(
  key: string,
  value: Record<string, unknown>,
): Promise<void> {
  if (!enabled || !db) throw new Error('MONGO_UNAVAILABLE');
  await db.collection('private_state').replaceOne(
    { _id: key as never },
    { ...value, _id: key } as never,
    { upsert: true },
  );
}

export async function deletePrivateState(key: string): Promise<void> {
  if (!enabled || !db) return;
  await db.collection('private_state').deleteOne({ _id: key as never });
}

/** Connect if MONGO_URI is set. Never throws — falls back to local JSON. */
export async function initMongo(): Promise<void> {
  const uri = env.storage.mongoUri.trim();
  if (!uri) {
    logger.info(
      '🗄️  MONGO_URI not set — operational records live in local files only. ' +
        '(Fine locally; on ephemeral hosts, settings, wallets and tournaments need MongoDB to survive redeploys.)',
    );
    return;
  }
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8_000 });
    await client.connect();
    db = client.db(env.storage.mongoDb.trim() || 'venomxmd');
    await db.command({ ping: 1 });
    enabled = true;
    logger.info(
      '🗄️  MongoDB connected — operational settings and records are redeploy-proof.',
    );
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
    .catch((err) => {
      mirrorFailure = err instanceof Error ? err : new Error(String(err));
      logger.warn({ err }, `mongo mirror write failed: ${name}/${key}`);
    })
    .then(() => undefined);
}

/** Queue a delete for a JSON delete (no-op unless Mongo is on). */
export function mirrorDelete(name: string, key: string): void {
  const coll = mirroredCollection(name);
  if (!coll) return;
  chain = chain
    .then(() => coll.deleteOne({ _id: key as never }))
    .catch((err) => {
      mirrorFailure = err instanceof Error ? err : new Error(String(err));
      logger.warn({ err }, `mongo mirror delete failed: ${name}/${key}`);
    })
    .then(() => undefined);
}

/** Resolves only when every queued mirror write has landed in Mongo. */
export async function flushMongo(): Promise<void> {
  await chain;
  if (mirrorFailure) {
    const failure = mirrorFailure;
    mirrorFailure = null;
    throw failure;
  }
}

/**
 * Pull mirrored operational collections from Mongo into the JSON store.
 * Call once at boot before the WhatsApp connection starts.
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
  // Do not connect to WhatsApp until every local-to-Mongo seed is durable.
  await flushMongo();
}
