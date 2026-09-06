import { downloadMediaMessage } from '@whiskeysockets/baileys';
import type { proto } from '@whiskeysockets/baileys';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { env } from '../config';
import { waLogger } from '../utils/logger';

ffmpeg.setFfmpegPath(ffmpegPath.path);

/**
 * Download a media message (image/video/audio/sticker) into a Buffer.
 * Pass the raw IWebMessageInfo of the media message you want.
 */
export async function downloadMedia(
  raw: proto.IWebMessageInfo,
): Promise<Buffer> {
  const buffer = (await downloadMediaMessage(
    raw,
    'buffer',
    {},
    { logger: waLogger, reuploadRequest: (async () => raw) as any },
  )) as Buffer;
  return buffer;
}

/**
 * Convert an image/video buffer into a WhatsApp sticker (webp).
 */
export async function makeSticker(input: Buffer): Promise<Buffer> {
  const sticker = new Sticker(input, {
    pack: env.sticker.pack,
    author: env.sticker.author,
    type: StickerTypes.FULL,
    quality: 60,
  });
  return sticker.toBuffer();
}

/** Fetch any URL into a Buffer (used by the downloader/media commands). */
export async function fetchBuffer(url: string): Promise<Buffer> {
  const { data } = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 60_000,
    headers: { 'User-Agent': 'Mozilla/5.0 (VENOM-XMD)' },
  });
  return Buffer.from(data);
}

/** Fetch JSON from any URL (for downloader APIs). */
export async function fetchJson<T = any>(url: string): Promise<T> {
  const { data } = await axios.get<T>(url, {
    timeout: 60_000,
    headers: { 'User-Agent': 'Mozilla/5.0 (VENOM-XMD)' },
  });
  return data;
}

/**
 * Convert a GIF buffer into an MP4 buffer. WhatsApp does not play real
 * GIFs — it plays MP4s flagged with gifPlayback:true. Used by the anime
 * reaction commands.
 */
export async function gifToMp4(gif: Buffer): Promise<Buffer> {
  const tmp = os.tmpdir();
  const id = Math.random().toString(36).slice(2);
  const inPath = path.join(tmp, `${id}.gif`);
  const outPath = path.join(tmp, `${id}.mp4`);
  await fs.promises.writeFile(inPath, gif);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inPath)
      .outputOptions([
        '-movflags faststart',
        '-pix_fmt yuv420p',
        // ensure even dimensions (required by yuv420p)
        '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2',
      ])
      .toFormat('mp4')
      .on('end', () => resolve())
      .on('error', reject)
      .save(outPath);
  });

  const out = await fs.promises.readFile(outPath);
  fs.promises.unlink(inPath).catch(() => {});
  fs.promises.unlink(outPath).catch(() => {});
  return out;
}

/** Available image filters powered by sharp. */
export type ImageFilter =
  | 'greyscale'
  | 'sepia'
  | 'negate'
  | 'blur'
  | 'sharpen'
  | 'pixelate'
  | 'rotate'
  | 'flip'
  | 'flop'
  | 'tint'
  | 'brighten'
  | 'darken';

/** Apply a named filter to an image buffer and return a PNG buffer. */
export async function applyImageFilter(
  input: Buffer,
  filter: ImageFilter,
): Promise<Buffer> {
  let img = sharp(input, { animated: false }).rotate(); // honor EXIF

  switch (filter) {
    case 'greyscale':
      img = img.greyscale();
      break;
    case 'sepia':
      img = img.recomb([
        [0.393, 0.769, 0.189],
        [0.349, 0.686, 0.168],
        [0.272, 0.534, 0.131],
      ]);
      break;
    case 'negate':
      img = img.negate();
      break;
    case 'blur':
      img = img.blur(8);
      break;
    case 'sharpen':
      img = img.sharpen({ sigma: 2 });
      break;
    case 'pixelate': {
      const meta = await sharp(input).metadata();
      const w = meta.width ?? 400;
      const h = meta.height ?? 400;
      img = sharp(input)
        .resize(Math.max(16, Math.round(w / 20)), Math.max(16, Math.round(h / 20)), {
          kernel: 'nearest',
        })
        .resize(w, h, { kernel: 'nearest' });
      break;
    }
    case 'rotate':
      img = img.rotate(90);
      break;
    case 'flip':
      img = img.flip();
      break;
    case 'flop':
      img = img.flop();
      break;
    case 'tint':
      img = img.tint({ r: 255, g: 100, b: 50 });
      break;
    case 'brighten':
      img = img.modulate({ brightness: 1.5 });
      break;
    case 'darken':
      img = img.modulate({ brightness: 0.6 });
      break;
  }

  return img.png().toBuffer();
}

/** Overlay one image (e.g. a meme sticker) at full size over another. */
export async function overlayImage(
  base: Buffer,
  overlayUrl: string,
): Promise<Buffer> {
  const meta = await sharp(base).metadata();
  const w = meta.width ?? 512;
  const h = meta.height ?? 512;
  const overlay = await fetchBuffer(overlayUrl);
  const resized = await sharp(overlay)
    .resize(w, h, { fit: 'fill' })
    .png()
    .toBuffer();
  return sharp(base)
    .composite([{ input: resized, blend: 'over' }])
    .png()
    .toBuffer();
}

/**
 * Send a reaction GIF fetched from a URL as an animated MP4.
 */
export async function sendGifFromUrl(
  send: (buffer: Buffer) => Promise<void>,
  url: string,
): Promise<void> {
  const gif = await fetchBuffer(url);
  const mp4 = await gifToMp4(gif);
  await send(mp4);
}
