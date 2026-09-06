/**
 * Anime service — resilient wrappers around free, no-key anime APIs.
 *
 * Verified working at build time (2026-09):
 *   - kitsu.io/api/edge          → anime / manga / character info (JSON:API)
 *   - nekos.best/api/v2          → SFW anime images (neko/waifu/husbando/kitsune)
 *   - api.nekosia.cat/api/v1     → SFW catgirl / random anime images
 *   - api.animechan.io/v1        → random anime quotes
 *   - yurippe.vercel.app/api     → anime quotes (fallback)
 *
 * NOTE: Jikan (api.jikan.moe) was returning 504s at build time, so Kitsu is
 * the primary metadata source. If Kitsu ever fails, Jikan can be dropped back
 * in — the shape is normalised here so callers don't care which one answered.
 */
import axios from 'axios';

const KITSU = 'https://kitsu.io/api/edge';
const KITSU_HEADERS = {
  Accept: 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
};
const UA = 'Mozilla/5.0 (compatible; VENOM-XMD/1.0)';

async function getJson<T = any>(
  url: string,
  headers: Record<string, string> = {},
  timeout = 25000,
): Promise<T> {
  const { data } = await axios.get<T>(url, {
    timeout,
    headers: { 'User-Agent': UA, ...headers },
  });
  return data;
}

function stripHtml(s?: string): string {
  return (s || '').replace(/<[^>]+>/g, '').trim();
}

/** ────────────────────────── Anime / Manga info ────────────────────────── */

export interface AnimeInfo {
  title: string;
  japanese?: string;
  type?: string;
  status?: string;
  episodes?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  rating?: string; // 0-100 → shown as x.x/10
  ageRating?: string;
  aired?: string;
  synopsis: string;
  poster?: string;
  youtubeId?: string;
}

export async function animeInfo(query: string): Promise<AnimeInfo> {
  const d = await getJson(
    `${KITSU}/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=1`,
    KITSU_HEADERS,
  );
  const item = d?.data?.[0];
  if (!item) throw new Error('not found');
  const a = item.attributes;
  return {
    title: a.canonicalTitle,
    japanese: a.titles?.ja_jp,
    type: a.subtype,
    status: a.status,
    episodes: a.episodeCount,
    rating: a.averageRating,
    ageRating: a.ageRating,
    aired: [a.startDate, a.endDate].filter(Boolean).join(' → '),
    synopsis: stripHtml(a.synopsis),
    poster: a.posterImage?.original || a.posterImage?.large,
    youtubeId: a.youtubeVideoId,
  };
}

export async function mangaInfo(query: string): Promise<AnimeInfo> {
  const d = await getJson(
    `${KITSU}/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=1`,
    KITSU_HEADERS,
  );
  const item = d?.data?.[0];
  if (!item) throw new Error('not found');
  const a = item.attributes;
  return {
    title: a.canonicalTitle,
    japanese: a.titles?.ja_jp,
    type: a.subtype,
    status: a.status,
    chapters: a.chapterCount,
    volumes: a.volumeCount,
    rating: a.averageRating,
    ageRating: a.ageRating,
    aired: [a.startDate, a.endDate].filter(Boolean).join(' → '),
    synopsis: stripHtml(a.synopsis),
    poster: a.posterImage?.original || a.posterImage?.large,
  };
}

export interface CharacterInfo {
  name: string;
  japanese?: string;
  description: string;
  image?: string;
}

export async function characterInfo(query: string): Promise<CharacterInfo> {
  const d = await getJson(
    `${KITSU}/characters?filter[name]=${encodeURIComponent(query)}&page[limit]=1`,
    KITSU_HEADERS,
  );
  const item = d?.data?.[0];
  if (!item) throw new Error('not found');
  const a = item.attributes;
  return {
    name: a.canonicalName || a.name,
    japanese: a.names?.ja_jp,
    description: stripHtml(a.description) || 'No description available.',
    image: a.image?.original,
  };
}

/** Format a 0-100 Kitsu rating as x.x/10. */
export function ratingOutOf10(rating?: string): string {
  const n = Number(rating);
  if (!rating || Number.isNaN(n)) return 'N/A';
  return (n / 10).toFixed(1) + '/10';
}

/** ────────────────────────── Anime images ────────────────────────── */

/** nekos.best categories that are SFW & reliable.
 *  NOTE: nekos.best returns 403 for browser-like User-Agent headers, so this
 *  call intentionally uses axios' default UA (no override). */
export async function nekosBest(category: string): Promise<string> {
  const { data: d } = await axios.get(`https://nekos.best/api/v2/${category}`, {
    timeout: 25000,
  });
  const url = d?.results?.[0]?.url;
  if (!url) throw new Error('image failed');
  return url;
}

/** nekosia catgirl / random. */
export async function nekosia(category = 'catgirl'): Promise<string> {
  const d = await getJson(`https://api.nekosia.cat/api/v1/images/${category}`);
  const url =
    d?.image?.original?.url || d?.image?.compressed?.url || d?.image?.url;
  if (!url) throw new Error('image failed');
  return url;
}

/** ────────────────────────── Anime quotes ────────────────────────── */

export interface AnimeQuote {
  quote: string;
  character: string;
  anime: string;
}

export async function animeQuote(): Promise<AnimeQuote> {
  // Primary: animechan
  try {
    const d = await getJson('https://api.animechan.io/v1/quotes/random');
    const q = d?.data;
    if (q?.content) {
      return {
        quote: q.content,
        character: q.character?.name || 'Unknown',
        anime: q.anime?.name || 'Unknown',
      };
    }
  } catch {
    /* fall through */
  }
  // Fallback: yurippe
  const arr = await getJson<any[]>(
    'https://yurippe.vercel.app/api/quotes?random=1',
  );
  const q = Array.isArray(arr) ? arr[0] : arr;
  if (!q?.quote) throw new Error('quote failed');
  return { quote: q.quote, character: q.character, anime: q.show };
}
