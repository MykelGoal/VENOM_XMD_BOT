import { env } from '../config';
import { logger } from '../utils/logger';

/**
 * Free Fire player lookup by UID.
 *
 * Primary: developers.freefirecommunity.com (needs a free FREEFIRE_API_KEY;
 * this backend blocks generic scripting so we send an identifying User-Agent).
 * Fallback: unofficial keyless mirrors (jinix6-style) — used only if no key is
 * set or the primary fails; these go down often, hence the key is recommended.
 *
 * Returns a normalized profile or throws a coded Error:
 *   NO_BACKEND   — nothing configured/reachable
 *   NOT_FOUND    — UID/region invalid or player not found
 *   RATE_LIMIT   — hit the free daily limit
 */

export interface FFProfile {
  uid: string;
  region: string;
  name?: string;
  level?: number;
  exp?: number;
  likes?: number;
  honorScore?: number;
  brRank?: string | number;
  brPoints?: number;
  csRank?: string | number;
  csPoints?: number;
  guildName?: string;
  guildLevel?: number;
  lastLogin?: string;
  createdAt?: string;
  bio?: string;
  source: string;
}

export const FF_REGIONS = [
  'ind', 'sg', 'br', 'id', 'tw', 'us', 'vn', 'th', 'me', 'pk', 'cis', 'bd', 'ru', 'eu', 'na',
];

const UA = 'VENOM-XMD/1.0 (+https://github.com/MykelGoal/VENOM_XMD_BOT)';

function withTimeout(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function tsToDate(v: unknown): string | undefined {
  const n = num(v);
  if (!n) return undefined;
  // Garena timestamps are seconds.
  const d = new Date((n > 1e12 ? n : n * 1000));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

/** Try the official keyed API. */
async function fetchOfficial(uid: string, region: string): Promise<FFProfile> {
  const url = `https://developers.freefirecommunity.com/api/v1/info?region=${encodeURIComponent(
    region,
  )}&uid=${encodeURIComponent(uid)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
      'x-api-key': env.freefire.apiKey,
    },
    signal: withTimeout(20000),
  });

  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (res.status === 404) throw new Error('NOT_FOUND');
  if (!res.ok) throw new Error(`HTTP_${res.status}`);

  const data = (await res.json()) as any;
  if (data?.success === false) {
    if (/not found|invalid/i.test(data?.message || '')) throw new Error('NOT_FOUND');
    throw new Error('HTTP_403');
  }

  // The payload nests info under basicInfo / clanBasicInfo etc.
  const b = data?.basicInfo ?? data?.AccountInfo ?? data ?? {};
  const clan = data?.clanBasicInfo ?? data?.guildInfo ?? {};
  return {
    uid,
    region: (b.region || region).toString().toLowerCase(),
    name: b.nickname ?? b.AccountName ?? b.username,
    level: num(b.level ?? b.AccountLevel),
    exp: num(b.exp ?? b.experience),
    likes: num(b.liked ?? b.likes),
    honorScore: num(b.honorScore ?? b.credit_score),
    brRank: b.rank ?? b.brRank ?? b.rankingPoints,
    brPoints: num(b.rankingPoints ?? b.brPoints),
    csRank: b.csRank ?? b.csRankingPoints,
    csPoints: num(b.csRankingPoints ?? b.csPoints),
    guildName: clan.clanName ?? clan.guildName,
    guildLevel: num(clan.clanLevel ?? clan.guildLevel),
    lastLogin: tsToDate(b.lastLoginAt),
    createdAt: tsToDate(b.createAt ?? b.createdAt),
    source: 'freefirecommunity',
  };
}

/** Try a keyless mirror base (jinix6-style). */
async function fetchKeyless(base: string, uid: string, region: string): Promise<FFProfile> {
  const url = `${base.replace(/\/$/, '')}/api/v1/account?region=${encodeURIComponent(
    region.toUpperCase(),
  )}&uid=${encodeURIComponent(uid)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: withTimeout(30000),
  });
  const text = await res.text();
  if (!res.ok || /not found/i.test(text)) throw new Error('NOT_FOUND');

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('NOT_FOUND');
  }
  const b = data?.basicInfo ?? data?.AccountInfo ?? {};
  const clan = data?.clanBasicInfo ?? {};
  if (!b || Object.keys(b).length === 0) throw new Error('NOT_FOUND');

  return {
    uid,
    region: (b.region || region).toString().toLowerCase(),
    name: b.nickname ?? b.username,
    level: num(b.level),
    exp: num(b.exp),
    likes: num(b.liked),
    honorScore: num(b.honorScore),
    brRank: b.rank ?? b.rankingPoints,
    brPoints: num(b.rankingPoints),
    csRank: b.csRank ?? b.csRankingPoints,
    csPoints: num(b.csRankingPoints),
    guildName: clan.clanName,
    guildLevel: num(clan.clanLevel),
    lastLogin: tsToDate(b.lastLoginAt),
    createdAt: tsToDate(b.createAt),
    source: 'keyless-mirror',
  };
}

/** Main entry. Returns a normalized profile or throws a coded error. */
export async function getFFProfile(uid: string, region: string): Promise<FFProfile> {
  const reg = region.toLowerCase();
  let lastErr: Error | null = null;

  // 1) Official keyed API (preferred)
  if (env.freefire.apiKey) {
    try {
      return await fetchOfficial(uid, reg);
    } catch (err) {
      lastErr = err as Error;
      if (lastErr.message === 'NOT_FOUND' || lastErr.message === 'RATE_LIMIT') throw lastErr;
      logger.debug({ err }, 'FF official lookup failed, trying fallbacks');
    }
  }

  // 2) Keyless mirrors
  const bases = env.freefire.fallbackBases
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const base of bases) {
    try {
      return await fetchKeyless(base, uid, reg);
    } catch (err) {
      lastErr = err as Error;
      if (lastErr.message === 'NOT_FOUND') continue;
      logger.debug({ err, base }, 'FF keyless mirror failed');
    }
  }

  if (lastErr?.message === 'NOT_FOUND') throw new Error('NOT_FOUND');
  if (!env.freefire.apiKey && bases.length === 0) throw new Error('NO_BACKEND');
  throw lastErr ?? new Error('NO_BACKEND');
}
