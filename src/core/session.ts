import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import axios from 'axios';
import { PATHS } from '../config';
import { env } from '../config';
import { logger } from '../utils/logger';

/**
 * SESSION_ID bootstrap.
 *
 * Deployers pair once on the VENOM session site, then paste the resulting
 * session string into the `SESSION_ID` env var. On boot we resolve it into a
 * real Baileys `creds.json` inside the sessions folder, so the bot starts
 * already authenticated — no QR scan on the server.
 *
 * Three formats are accepted:
 *
 *   1. Long   →  "VENOM~<base64url(gzip(creds.json))>"   (self-contained, offline)
 *   2. Short  →  "VENOM-XXXX-XXXX"                        (fetched from the site)
 *   3. Plain  →  "eyJ..."  (base64 of creds.json)         (legacy)
 *
 * The short ID is PERMANENT (cloud-backed on the site). We also keep the cloud
 * copy fresh: on every creds rotation we push the new creds back, so a restart
 * always finds a valid session.
 */

const SHORT_RE = /^VENOM-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const TOKEN_FILE = path.join(PATHS.sessions, '.cloudtoken');
const CREDS_FILE = path.join(PATHS.sessions, 'creds.json');

/** Normalise a short code like "venomk7m29xpq" → "VENOM-K7M2-9XPQ". */
function normalizeShort(raw: string): string {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (compact.startsWith('VENOM') && compact.length === 13) {
    const body = compact.slice(5);
    return `VENOM-${body.slice(0, 4)}-${body.slice(4)}`;
  }
  return raw.trim().toUpperCase();
}

export function isShortId(raw: string): boolean {
  return SHORT_RE.test(normalizeShort(raw));
}

/** Base URL of the deployed VENOM session site, without a trailing slash. */
function siteUrl(): string {
  return (env.session.siteUrl || '').replace(/\/+$/, '');
}

/** Decode a long "VENOM~..." session into the raw creds.json string. */
function decodeLongId(raw: string): string {
  const b64 = raw.slice('VENOM~'.length);
  const gz = Buffer.from(b64, 'base64url');
  return zlib.gunzipSync(gz).toString('utf8');
}

/** Decode a legacy plain base64 session into the raw creds.json string. */
function decodePlain(raw: string): string {
  return Buffer.from(raw, 'base64').toString('utf8');
}

/** Fetch creds for a short VENOM-ID from the session site (cloud → grab fallback). */
async function fetchShortId(
  code: string,
): Promise<{ creds: string; token?: string }> {
  const base = siteUrl();
  if (!base) {
    throw new Error(
      'SESSION_ID is a short VENOM-ID but SESSION_SITE_URL is not set. ' +
        'Set SESSION_SITE_URL to your deployed session site (e.g. https://your-site.onrender.com).',
    );
  }
  // Primary: permanent cloud session (never burns, returns an update token).
  try {
    const { data } = await axios.get(
      `${base}/api/cloudsession/${encodeURIComponent(code)}`,
      { timeout: 20000 },
    );
    if (data?.creds) return { creds: data.creds, token: data.token };
  } catch (e: any) {
    logger.warn(
      `Cloud session fetch failed (${e?.response?.status || e.message}); trying one-time grab…`,
    );
  }
  // Fallback: one-time grab (older/unclouded sessions).
  const { data } = await axios.get(
    `${base}/api/grab/${encodeURIComponent(code)}`,
    { timeout: 20000 },
  );
  if (!data?.creds) {
    throw new Error('Session site returned no credentials for this code.');
  }
  return { creds: data.creds };
}

/**
 * Resolve the SESSION_ID env var into a creds.json written to the sessions
 * folder. No-op when SESSION_ID is empty or a session already exists on disk.
 */
export async function restoreSessionFromEnv(): Promise<void> {
  const raw = (env.session.id || '').trim();
  if (!raw) return; // no SESSION_ID → normal QR / pairing flow

  // Don't clobber an already-authenticated on-disk session.
  if (fs.existsSync(CREDS_FILE)) {
    logger.info('Existing session found on disk — skipping SESSION_ID restore.');
    return;
  }

  fs.mkdirSync(PATHS.sessions, { recursive: true });

  let credsJson: string;
  let cloudToken: string | undefined;

  try {
    if (raw.startsWith('VENOM~')) {
      logger.info('Restoring session from long SESSION_ID (offline decode)…');
      credsJson = decodeLongId(raw);
    } else if (isShortId(raw)) {
      const code = normalizeShort(raw);
      logger.info(`Restoring session from short SESSION_ID ${code} (cloud fetch)…`);
      const res = await fetchShortId(code);
      credsJson = res.creds;
      cloudToken = res.token;
      // Remember the code + token so we can keep the cloud copy fresh.
      fs.writeFileSync(
        TOKEN_FILE,
        JSON.stringify({ code, token: cloudToken || '' }),
        'utf8',
      );
    } else if (/^[A-Za-z0-9+/=_-]+$/.test(raw) && raw.length > 100) {
      logger.info('Restoring session from plain base64 SESSION_ID (legacy)…');
      credsJson = decodePlain(raw);
    } else {
      throw new Error(
        'Unrecognised SESSION_ID format. Expected VENOM~..., VENOM-XXXX-XXXX, or a base64 creds string.',
      );
    }

    // Validate it parses as JSON before committing it to disk.
    JSON.parse(credsJson);
    fs.writeFileSync(CREDS_FILE, credsJson, 'utf8');
    logger.info('✅ Session restored from SESSION_ID — starting pre-authenticated.');
  } catch (e: any) {
    logger.error(`Failed to restore session from SESSION_ID: ${e.message}`);
    throw new Error(`SESSION_ID restore failed: ${e.message}`);
  }
}

/**
 * Push the current creds back to the session site so the permanent cloud copy
 * stays fresh across restarts. Safe no-op unless a short cloud session is in
 * use and SESSION_SITE_URL is set. Called on every creds.update.
 */
export async function syncSessionToCloud(): Promise<void> {
  const base = siteUrl();
  if (!base) return;
  if (!fs.existsSync(TOKEN_FILE) || !fs.existsSync(CREDS_FILE)) return;

  let meta: { code: string; token: string };
  try {
    meta = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  } catch {
    return;
  }
  if (!meta.code) return;

  try {
    const creds = fs.readFileSync(CREDS_FILE, 'utf8');
    const { data } = await axios.put(
      `${base}/api/cloudsession/${encodeURIComponent(meta.code)}`,
      { token: meta.token, creds },
      { timeout: 20000 },
    );
    // The site may hand back a fresh token on self-heal — persist it.
    if (data?.token && data.token !== meta.token) {
      fs.writeFileSync(
        TOKEN_FILE,
        JSON.stringify({ code: meta.code, token: data.token }),
        'utf8',
      );
    }
  } catch {
    /* non-fatal: cloud refresh is best-effort */
  }
}
