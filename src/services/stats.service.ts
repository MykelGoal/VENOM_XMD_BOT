import axios from 'axios';
import { env } from '../config';
import { logger } from '../utils/logger';
import { settingsRepo } from '../database/repositories/settings.repo';

/**
 * Growth / social stats service. Pulls live numbers where possible and lets the
 * owner set the rest manually. Powers the .stats command and the Venom Brain's
 * self-awareness (so the AI can flex real numbers to pull people in).
 *
 * Sources:
 *   • GitHub stars/forks  → public API, no key
 *   • YouTube subscribers → YouTube Data API (free key) if configured
 *   • TikTok / anything   → manual, set with .setstat (no reliable free API)
 */

export interface SocialStats {
  githubStars?: number;
  githubForks?: number;
  youtubeSubs?: number;
  tiktokFollowers?: number;
  /** Manually-set numbers (tiktok, whatsapp users, etc.). */
  manual: Record<string, string>;
}

// Cache to avoid hammering APIs — refreshed every 10 minutes.
let cache: { at: number; data: SocialStats } | undefined;
const TTL_MS = 10 * 60_000;

async function fetchGitHub(): Promise<{ stars?: number; forks?: number }> {
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${env.social.githubRepo}`,
      { headers: { 'User-Agent': env.botName }, timeout: 12_000 },
    );
    return { stars: data.stargazers_count, forks: data.forks_count };
  } catch (err) {
    logger.debug({ err }, 'github stats fetch failed');
    return {};
  }
}

async function fetchYouTube(): Promise<number | undefined> {
  const { youtubeApiKey, youtubeChannelId } = env.social;
  if (!youtubeApiKey || !youtubeChannelId) return undefined;
  try {
    const { data } = await axios.get(
      'https://www.googleapis.com/youtube/v3/channels',
      {
        params: { part: 'statistics', id: youtubeChannelId, key: youtubeApiKey },
        timeout: 12_000,
      },
    );
    const n = data?.items?.[0]?.statistics?.subscriberCount;
    return n ? Number(n) : undefined;
  } catch (err) {
    logger.debug({ err }, 'youtube stats fetch failed');
    return undefined;
  }
}

/** Owner-set manual stats live in the settings store under stat.<key>. */
function manualStats(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const kv of settingsRepo.all()) {
    if (kv.key.startsWith('stat.')) out[kv.key.slice(5)] = kv.value;
  }
  return out;
}

export function setManualStat(key: string, value: string): void {
  settingsRepo.set(`stat.${key.toLowerCase()}`, value);
  cache = undefined; // invalidate so .stats reflects it immediately
}

/** Get all stats, using a 10-minute cache. Pass force=true to refresh now. */
export async function getStats(force = false): Promise<SocialStats> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;

  const [gh, yt] = await Promise.all([fetchGitHub(), fetchYouTube()]);
  const manual = manualStats();

  const data: SocialStats = {
    githubStars: gh.stars,
    githubForks: gh.forks,
    youtubeSubs: yt,
    tiktokFollowers: manual.tiktok ? Number(manual.tiktok) : undefined,
    manual,
  };
  cache = { at: Date.now(), data };
  return data;
}

/** A compact one-line summary for the Brain, e.g. "250⭐ · 40 forks · 1.2K TikTok". */
export function summarizeStats(s: SocialStats): string {
  const parts: string[] = [];
  if (s.githubStars !== undefined) parts.push(`${s.githubStars}⭐ GitHub`);
  if (s.githubForks !== undefined) parts.push(`${s.githubForks} forks`);
  if (s.youtubeSubs !== undefined) parts.push(`${s.youtubeSubs} YouTube subs`);
  if (s.tiktokFollowers !== undefined)
    parts.push(`${s.tiktokFollowers} TikTok followers`);
  for (const [k, v] of Object.entries(s.manual)) {
    if (k === 'tiktok') continue; // already shown
    parts.push(`${v} ${k}`);
  }
  return parts.join(' · ') || 'no stats yet';
}
