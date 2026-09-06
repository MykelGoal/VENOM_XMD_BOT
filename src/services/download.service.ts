/**
 * Download service — thin, resilient wrappers around free public endpoints
 * plus the `yt-search` npm package. Every network call is wrapped in
 * try/catch by the callers; these helpers throw on failure so commands can
 * present a clean error. Endpoints are intentionally centralised here so a
 * dead host only needs fixing in one place.
 *
 * Verified working at build time (2026-09):
 *   - yt-search (npm)                         → YouTube search + metadata
 *   - apis.davidcyriltech.my.id/download/*    → ytmp3, ytmp4, apk
 *   - apis.davidcyriltech.my.id/facebook      → facebook video
 *   - apis.davidcyriltech.my.id/spotifydl     → spotify track download
 *   - tikwm.com/api                           → tiktok (no watermark)
 */
import axios from 'axios';
import yts from 'yt-search';

const DC = 'https://apis.davidcyriltech.my.id';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

async function getJson<T = any>(url: string, timeout = 30000): Promise<T> {
  const { data } = await axios.get<T>(url, {
    timeout,
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  return data;
}

/** ────────────────────────── YouTube ────────────────────────── */

export interface YtVideo {
  title: string;
  url: string;
  videoId: string;
  duration: string;
  views: number;
  author: string;
  thumbnail: string;
  ago: string;
}

export async function ytSearch(query: string, limit = 8): Promise<YtVideo[]> {
  const r = await yts(query);
  return (r.videos || []).slice(0, limit).map((v: any) => ({
    title: v.title,
    url: v.url,
    videoId: v.videoId,
    duration: v.timestamp || 'live',
    views: v.views || 0,
    author: v.author?.name || 'Unknown',
    thumbnail: v.thumbnail || v.image,
    ago: v.ago || '',
  }));
}

/** Resolve a query to a single video URL (first search hit) or pass through a URL. */
export async function resolveYt(input: string): Promise<YtVideo> {
  if (/youtu\.?be/i.test(input)) {
    const id = extractYtId(input);
    const r = await yts({ videoId: id });
    return {
      title: r.title,
      url: r.url,
      videoId: r.videoId,
      duration: r.timestamp || 'live',
      views: r.views || 0,
      author: r.author?.name || 'Unknown',
      thumbnail: r.thumbnail || r.image,
      ago: r.ago || '',
    };
  }
  const list = await ytSearch(input, 1);
  if (!list.length) throw new Error('No results');
  return list[0];
}

function extractYtId(url: string): string {
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/shorts\/([\w-]{11})/);
  return m ? m[1] : url;
}

export interface DlResult {
  title: string;
  url: string; // direct media url
  thumbnail?: string;
  quality?: string;
}

export async function ytMp3(videoUrl: string): Promise<DlResult> {
  const d = await getJson(`${DC}/download/ytmp3?url=${encodeURIComponent(videoUrl)}`);
  const r = d?.result;
  if (!r?.download_url) throw new Error('ytmp3 failed');
  return { title: r.title, url: r.download_url, thumbnail: r.thumbnail, quality: r.quality };
}

export async function ytMp4(videoUrl: string): Promise<DlResult> {
  const d = await getJson(`${DC}/download/ytmp4?url=${encodeURIComponent(videoUrl)}`);
  const r = d?.result;
  if (!r?.download_url) throw new Error('ytmp4 failed');
  return { title: r.title, url: r.download_url, thumbnail: r.thumbnail, quality: r.quality };
}

/** ────────────────────────── TikTok ────────────────────────── */

export interface TikTokResult {
  title: string;
  video: string; // no-watermark mp4
  music?: string;
  author: string;
  cover?: string;
}

export async function tiktok(url: string): Promise<TikTokResult> {
  const d = await getJson(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
  if (d?.code !== 0 || !d?.data) throw new Error(d?.msg || 'tiktok failed');
  const t = d.data;
  const base = 'https://tikwm.com';
  const norm = (u?: string) => (u ? (u.startsWith('http') ? u : base + u) : undefined);
  return {
    title: t.title || 'TikTok video',
    video: norm(t.hdplay || t.play)!,
    music: norm(t.music),
    author: t.author?.unique_id || t.author?.nickname || 'unknown',
    cover: norm(t.cover),
  };
}

/** ────────────────────────── Facebook ────────────────────────── */

export async function facebook(
  url: string,
): Promise<{ title: string; sd?: string; hd?: string }> {
  const d = await getJson(`${DC}/facebook?url=${encodeURIComponent(url)}`);
  const r = d?.result;
  if (!r?.downloads) throw new Error('facebook failed');
  return {
    title: r.title || 'Facebook video',
    sd: r.downloads.sd?.url,
    hd: r.downloads.hd?.url,
  };
}

/** ────────────────────────── Spotify ────────────────────────── */

export interface SpotifyResult {
  title: string;
  channel: string;
  url: string; // direct audio
  thumbnail?: string;
  duration?: string;
}

export async function spotify(trackUrl: string): Promise<SpotifyResult> {
  const d = await getJson(`${DC}/spotifydl?url=${encodeURIComponent(trackUrl)}`);
  if (!d?.DownloadLink && !d?.download && !d?.url)
    throw new Error('spotify failed');
  return {
    title: d.title || 'Spotify track',
    channel: d.channel || d.artist || 'Unknown',
    url: d.DownloadLink || d.download || d.url,
    thumbnail: d.thumbnail,
    duration: d.duration,
  };
}

/** ────────────────────────── APK ────────────────────────── */

export interface ApkResult {
  name: string;
  version: string;
  size?: string;
  icon?: string;
  url: string;
  packageName?: string;
}

export async function apk(query: string): Promise<ApkResult> {
  const d = await getJson(`${DC}/download/apk?text=${encodeURIComponent(query)}`);
  const a = d?.apk || d?.result;
  const url = a?.downloadLink || a?.dllink || a?.download || a?.url;
  if (!url) throw new Error('apk failed');
  return {
    name: a.name || query,
    version: a.lastUpdated || a.version || '',
    size: a.size,
    icon: a.icon,
    url,
    packageName: a.package,
  };
}

/** ────────────────────────── Lyrics ────────────────────────── */

export async function lyrics(
  title: string,
): Promise<{ title: string; artist: string; lyrics: string }> {
  // Primary: lyrist; fallback: davidcyriltech
  try {
    const d = await getJson(`https://lyrist.vercel.app/api/${encodeURIComponent(title)}`);
    if (d?.lyrics) return { title: d.title || title, artist: d.artist || '', lyrics: d.lyrics };
  } catch {
    /* fall through */
  }
  const d = await getJson(`${DC}/lyrics?title=${encodeURIComponent(title)}`);
  const r = d?.result || d;
  if (!r?.lyrics) throw new Error('lyrics not found');
  return { title: r.title || title, artist: r.artist || '', lyrics: r.lyrics };
}

/** ────────────────────────── helpers ────────────────────────── */

export function formatViews(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}
