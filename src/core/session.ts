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

/**
 * Decode a self-contained session ID (what the session site hands out).
 * Robust to common paste variants — we accept whatever yields valid creds JSON:
 *   1) already-raw creds.json  ({"noiseKey":...})
 *   2) plain base64 of creds.json  (eyJ...)  ← the usual case
 *   3) an optional "PREFIX;base64" / "PREFIX~base64" wrapper
 */
function decodeSelfContained(raw: string): string {
  const looksLikeJson = (s: string) => {
    const t = s.trim();
    if (!t.startsWith('{')) return false;
    try {
      JSON.parse(t);
      return true;
    } catch {
      return false;
    }
  };

  // 1) Pasted creds.json directly.
  if (looksLikeJson(raw)) return raw.trim();

  // Build candidate base64 strings to try (with and without a prefix wrapper).
  const candidates = new Set<string>();
  const cleaned = raw.trim().replace(/\s+/g, '');
  candidates.add(cleaned);
  const sepMatch = cleaned.match(/[;~:|]/);
  if (sepMatch) candidates.add(cleaned.slice(cleaned.indexOf(sepMatch[0]) + 1));

  for (const cand of candidates) {
    // 2) gzip'd base64url (VENOM~ style, but prefix already stripped)
    try {
      const gz = Buffer.from(cand, 'base64url');
      if (gz[0] === 0x1f && gz[1] === 0x8b) {
        const out = zlib.gunzipSync(gz).toString('utf8');
        if (looksLikeJson(out)) return out;
      }
    } catch {
      /* try next */
    }
    // 3) plain base64 → JSON
    try {
      const out = Buffer.from(cand, 'base64').toString('utf8');
      if (looksLikeJson(out)) return out;
    } catch {
      /* try next */
    }
  }

  throw new Error(
    'Unrecognised SESSION_ID. Re-copy it from the session site (should look like eyJ… or VENOM~…).',
  );
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
    } else {
      // Self-contained session (what the VENOM session site hands out):
      // usually plain base64 of creds.json (eyJ...), but be tolerant of a
      // stray prefix, whitespace, or creds.json pasted raw. We decide by
      // "does it decode to valid creds JSON", not by a fragile length guess.
      logger.info('Restoring session from self-contained SESSION_ID…');
      credsJson = decodeSelfContained(raw);
    }

    // Validate it parses as valid creds JSON before committing it to disk.
    const parsed = JSON.parse(credsJson);
    if (!parsed || typeof parsed !== 'object' || !('noiseKey' in parsed || 'me' in parsed || 'registered' in parsed)) {
      throw new Error('decoded data does not look like WhatsApp credentials.');
    }
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
