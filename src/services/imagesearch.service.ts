/**
 * Image / wallpaper / code-image services — resilient wrappers around free,
 * no-key public endpoints.
 *
 * Verified working at build time (2026-09):
 *   - wallhaven.cc/api/v1/search            → wallpapers (SFW only, purity=100)
 *   - apis.davidcyriltech.my.id/search/pinterest → pinterest image results
 *   - carbonara.solopov.dev/api/cook        → code → carbon-style PNG
 */
import axios from 'axios';

const DC = 'https://apis.davidcyriltech.my.id';

/** ────────────────────────── Wallpapers ────────────────────────── */

export interface Wallpaper {
  url: string; // full-res image
  thumb: string;
  resolution: string;
  source: string;
}

export async function wallpapers(query: string, limit = 5): Promise<Wallpaper[]> {
  const { data } = await axios.get(
    `https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(
      query,
    )}&purity=100&categories=111&sorting=random`,
    { timeout: 25000 },
  );
  const list = data?.data || [];
  if (!list.length) throw new Error('no wallpapers');
  return list.slice(0, limit).map((w: any) => ({
    url: w.path,
    thumb: w.thumbs?.large || w.thumbs?.original,
    resolution: w.resolution,
    source: w.url,
  }));
}

/** ────────────────────────── Pinterest / image search ────────────────────────── */

export interface ImageHit {
  image: string;
  caption?: string;
  uploader?: string;
}

export async function pinterest(query: string, limit = 5): Promise<ImageHit[]> {
  const { data } = await axios.get(
    `${DC}/search/pinterest?text=${encodeURIComponent(query)}`,
    { timeout: 25000 },
  );
  const list = data?.result || [];
  const withImages = list.filter((r: any) => r?.image);
  if (!withImages.length) throw new Error('no results');
  return withImages.slice(0, limit).map((r: any) => ({
    image: r.image,
    caption: r.caption?.trim() || undefined,
    uploader: r.fullName || r.uploader,
  }));
}

/** ────────────────────────── Code → image (carbon) ────────────────────────── */

export async function carbonImage(
  code: string,
  opts: { theme?: string; language?: string; background?: string } = {},
): Promise<Buffer> {
  const { data } = await axios.post(
    'https://carbonara.solopov.dev/api/cook',
    {
      code,
      theme: opts.theme || 'seti',
      language: opts.language || 'auto',
      backgroundColor: opts.background || '#1F816D',
      dropShadow: true,
      windowControls: true,
      widthAdjustment: true,
    },
    { responseType: 'arraybuffer', timeout: 30000 },
  );
  return Buffer.from(data);
}
