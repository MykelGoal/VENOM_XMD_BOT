import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from 'crypto';
import { PATHS, env } from '../config';
import {
  deletePrivateState,
  isMongoEnabled,
  readPrivateState,
  writePrivateState,
} from '../database/mongo';
import { logger } from '../utils/logger';

const PRIVATE_STATE_KEY = 'baileys-auth-v1';
const VERSION = 1;
const BINDING_FILE = '.sessionbinding';

interface AuthArchive {
  version: number;
  files: Record<string, string>;
  createdAt: number;
}

interface EncryptedAuthArchive extends Record<string, unknown> {
  version: number;
  binding: string;
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
  updatedAt: number;
  fileCount: number;
}

function encryptionSecret(): string {
  return env.session.authStateSecret.trim() || env.session.id.trim();
}

function sessionBinding(): string {
  return createHash('sha256')
    .update(env.session.id.trim() || 'paired-without-session-id')
    .digest('hex');
}

function authFiles(): string[] {
  try {
    return fs
      .readdirSync(PATHS.sessions, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name !== '.gitkeep' &&
          !entry.name.endsWith('.tmp') &&
          !entry.name.includes('/') &&
          !entry.name.includes('\\'),
      )
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function completeLocalStatePresent(): boolean {
  const files = authFiles();
  return files.includes('creds.json') && files.some(
    (name) => !['creds.json', '.cloudtoken', BINDING_FILE].includes(name),
  );
}

function clearLocalAuthFiles(): void {
  for (const name of authFiles()) {
    fs.rmSync(path.join(PATHS.sessions, name), { force: true });
  }
}

function buildArchive(): Buffer {
  const files: Record<string, string> = {};
  for (const name of authFiles()) {
    files[name] = fs.readFileSync(path.join(PATHS.sessions, name)).toString('base64');
  }
  if (!files['creds.json']) throw new Error('AUTH_CREDS_MISSING');
  const archive: AuthArchive = { version: VERSION, files, createdAt: Date.now() };
  return zlib.gzipSync(Buffer.from(JSON.stringify(archive), 'utf8'), { level: 9 });
}

function encryptArchive(plain: Buffer): EncryptedAuthArchive {
  const secret = encryptionSecret();
  if (!secret) throw new Error('AUTH_STATE_SECRET_MISSING');
  const binding = sessionBinding();
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(secret, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`${VERSION}:${binding}`, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    version: VERSION,
    binding,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    updatedAt: Date.now(),
    fileCount: authFiles().length,
  };
}

function decryptArchive(record: Record<string, unknown>): AuthArchive {
  const encrypted = record as EncryptedAuthArchive;
  if (encrypted.version !== VERSION) throw new Error('AUTH_ARCHIVE_VERSION');
  if (encrypted.binding !== sessionBinding()) throw new Error('AUTH_SESSION_BINDING_CHANGED');
  const secret = encryptionSecret();
  if (!secret) throw new Error('AUTH_STATE_SECRET_MISSING');
  const key = scryptSync(secret, Buffer.from(encrypted.salt, 'base64'), 32);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encrypted.iv, 'base64'),
  );
  decipher.setAAD(Buffer.from(`${VERSION}:${encrypted.binding}`, 'utf8'));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  const zipped = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
    decipher.final(),
  ]);
  const archive = JSON.parse(zlib.gunzipSync(zipped).toString('utf8')) as AuthArchive;
  if (archive.version !== VERSION || !archive.files?.['creds.json']) {
    throw new Error('AUTH_ARCHIVE_INVALID');
  }
  return archive;
}

/**
 * Restore the complete Signal state before SESSION_ID's creds-only fallback.
 * A changed SESSION_ID deliberately invalidates the old archive so rotating a
 * linked device cannot silently resurrect the previous one.
 */
export async function restoreCompleteAuthState(): Promise<boolean> {
  if (completeLocalStatePresent()) {
    const marker = path.join(PATHS.sessions, BINDING_FILE);
    const localBinding = fs.existsSync(marker)
      ? fs.readFileSync(marker, 'utf8').trim()
      : '';
    if (!localBinding || localBinding === sessionBinding()) {
      logger.info('Complete local WhatsApp auth state found; Mongo restore not needed.');
      return true;
    }
    logger.warn('SESSION_ID changed; clearing the locally cached previous auth state before rotation.');
    clearLocalAuthFiles();
  }
  if (!isMongoEnabled() || !encryptionSecret()) return false;
  const record = await readPrivateState(PRIVATE_STATE_KEY);
  if (!record) return false;
  try {
    const archive = decryptArchive(record);
    fs.mkdirSync(PATHS.sessions, { recursive: true });
    clearLocalAuthFiles();
    for (const [name, encoded] of Object.entries(archive.files)) {
      if (path.basename(name) !== name || name === '.gitkeep') continue;
      const target = path.join(PATHS.sessions, name);
      const temporary = `${target}.${process.pid}.tmp`;
      fs.writeFileSync(temporary, Buffer.from(encoded, 'base64'), { mode: 0o600 });
      fs.renameSync(temporary, target);
    }
    fs.writeFileSync(path.join(PATHS.sessions, BINDING_FILE), sessionBinding(), { mode: 0o600 });
    logger.info(`🔐 Restored complete encrypted WhatsApp auth state (${Object.keys(archive.files).length} files) from MongoDB.`);
    return true;
  } catch (err) {
    if ((err as Error)?.message === 'AUTH_SESSION_BINDING_CHANGED') {
      logger.warn('SESSION_ID changed; ignoring the previous encrypted WhatsApp auth archive. A newly rotated session will replace it.');
      return false;
    }
    logger.error({ err }, 'Encrypted WhatsApp auth archive could not be restored; rotate/re-pair rather than using partial credentials.');
    return false;
  }
}

let persistChain: Promise<void> = Promise.resolve();

/** Persist creds plus every Signal/app-state key as one encrypted Mongo blob. */
export function persistCompleteAuthState(): Promise<void> {
  if (!isMongoEnabled()) return Promise.resolve();
  if (!encryptionSecret()) {
    logger.warn('Complete auth persistence is disabled: set AUTH_STATE_SECRET (or SESSION_ID) to encrypt Signal keys.');
    return Promise.resolve();
  }
  persistChain = persistChain.then(async () => {
    const files = authFiles();
    if (!files.includes('creds.json')) return;
    fs.writeFileSync(path.join(PATHS.sessions, BINDING_FILE), sessionBinding(), { mode: 0o600 });
    const encrypted = encryptArchive(buildArchive());
    await writePrivateState(PRIVATE_STATE_KEY, encrypted);
    logger.debug(`Persisted complete encrypted WhatsApp auth state (${encrypted.fileCount} files).`);
  });
  return persistChain;
}

let scheduledPersist: NodeJS.Timeout | undefined;

/** Coalesce rapid ratchet updates so active groups do not write one archive per message. */
export function scheduleCompleteAuthStatePersistence(): void {
  if (scheduledPersist) clearTimeout(scheduledPersist);
  scheduledPersist = setTimeout(() => {
    scheduledPersist = undefined;
    void persistCompleteAuthState().catch((err) =>
      logger.error(
        { err },
        'Complete WhatsApp auth-state backup failed; avoid redeploying until MongoDB is healthy.',
      ),
    );
  }, 1000);
  scheduledPersist.unref?.();
}

/** Prevent a logged-out device from being resurrected on the next restart. */
export async function clearCompleteAuthState(): Promise<void> {
  if (scheduledPersist) {
    clearTimeout(scheduledPersist);
    scheduledPersist = undefined;
  }
  await persistChain.catch(() => {});
  await deletePrivateState(PRIVATE_STATE_KEY);
}

export function completeAuthPersistenceConfigured(): boolean {
  return isMongoEnabled() && Boolean(encryptionSecret());
}
