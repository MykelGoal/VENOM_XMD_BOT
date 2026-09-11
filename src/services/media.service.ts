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
import FormData from 'form-data';
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
 * Optional pack/author override the configured defaults.
 */
export async function makeSticker(
  input: Buffer,
  opts?: { pack?: string; author?: string; type?: StickerTypes },
): Promise<Buffer> {
  const sticker = new Sticker(input, {
    pack: opts?.pack ?? env.sticker.pack,
    author: opts?.author ?? env.sticker.author,
    type: opts?.type ?? StickerTypes.FULL,
    quality: 60,
  });
  return sticker.toBuffer();
}

/** Make a circular-cropped sticker from an image. */
export async function makeCircleSticker(input: Buffer): Promise<Buffer> {
  const size = 512;
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  const png = await sharp(input)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: circle, blend: 'dest-in' }])
    .png()
    .toBuffer();
  return makeSticker(png, { type: StickerTypes.FULL });
}

/** Make a rounded-corner sticker from an image. */
export async function makeRoundedSticker(input: Buffer): Promise<Buffer> {
  const size = 512;
  const r = 80;
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/></svg>`,
  );
  const png = await sharp(input)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  return makeSticker(png, { type: StickerTypes.FULL });
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

/** Apply an ffmpeg audio filter chain to an audio buffer → mp3 buffer. */
export async function applyAudioFilter(
  input: Buffer,
  filter: string,
): Promise<Buffer> {
  const tmp = os.tmpdir();
  const id = Math.random().toString(36).slice(2);
  const inPath = path.join(tmp, `${id}.in`);
  const outPath = path.join(tmp, `${id}.mp3`);
  await fs.promises.writeFile(inPath, input);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inPath)
      .audioFilters(filter)
      .toFormat('mp3')
      .on('end', () => resolve())
      .on('error', reject)
      .save(outPath);
  });

  const out = await fs.promises.readFile(outPath);
  fs.promises.unlink(inPath).catch(() => {});
  fs.promises.unlink(outPath).catch(() => {});
  return out;
}

/** Convert any audio/video buffer to mp3. */
export async function toMp3(input: Buffer): Promise<Buffer> {
  return applyAudioFilter(input, 'volume=1.0');
}

/**
 * Convert any audio buffer to WhatsApp's NATIVE voice-note format
 * (OGG/Opus). Voice notes sent as MP3 (audio/mpeg) refuse to play on
 * many devices — "couldn't be played" — because real voice notes are
 * Opus. Always wrap TTS/converted audio with this before sending ptt.
 */
export async function toVoiceNote(input: Buffer): Promise<Buffer> {
  const tmp = os.tmpdir();
  const id = Math.random().toString(36).slice(2);
  const inPath = path.join(tmp, `${id}.in`);
  const outPath = path.join(tmp, `${id}.ogg`);
  await fs.promises.writeFile(inPath, input);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inPath)
      .audioChannels(1)
      .audioFrequency(24000)
      .audioBitrate('32k')
      .toFormat('ogg')
      .audioCodec('libopus')
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

/** Compress an image: resize down and drop JPEG quality. */
export async function compressImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 55, mozjpeg: true })
    .toBuffer();
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

/**
 * Remove the background from an image, returning a transparent PNG buffer.
 *
 * Uses @imgly/background-removal-node — an ONNX segmentation model that runs
 * fully in-process. No API key, no external service, works offline. The model
 * weights are bundled with the package, so the first call may take a few
 * seconds to warm up; subsequent calls are faster.
 */
/**
 * Remove the background from an image, returning a transparent PNG buffer.
 *
 * Two backends, tried in order:
 *   1. remove.bg API — if REMOVEBG_API_KEY is set. Works on ANY host (low
 *      memory), reliable, free tier = 50 images/month. Best for free hosts.
 *   2. @imgly/background-removal-node — a local ONNX model. No key, works
 *      offline, but loads a ~127MB model and needs ~1-2GB RAM, so it gets
 *      OOM-killed on 512MB free hosts. Great on a VPS.
 *
 * @throws Error('NO_BACKEND') if the local model OOMs / is unavailable and no
 *         API key is configured.
 */
export async function removeImageBackground(input: Buffer): Promise<Buffer> {
  // Normalise to PNG first so either backend gets a clean, predictable input.
  const png = await sharp(input).png().toBuffer();

  // ── Backend 1: remove.bg API (low memory, host-friendly) ──
  const apiKey = env.removebgApiKey;
  if (apiKey) {
    const form = new FormData();
    form.append('image_file', png, { filename: 'image.png', contentType: 'image/png' });
    form.append('size', 'auto');
    const { data } = await axios.post(
      'https://api.remove.bg/v1.0/removebg',
      form,
      {
        headers: { ...form.getHeaders(), 'X-Api-Key': apiKey },
        responseType: 'arraybuffer',
        timeout: 60_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );
    return Buffer.from(data);
  }

  // ── Backend 2: local ONNX model (needs RAM; may OOM on free hosts) ──
  try {
    const { removeBackground } = await import('@imgly/background-removal-node');
    const blob = new Blob([new Uint8Array(png)], { type: 'image/png' });
    const result = await removeBackground(blob, { output: { format: 'image/png' } });
    const arrayBuf = await result.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    waLogger.warn({ err }, 'local background removal failed (likely low memory)');
    throw new Error('NO_BACKEND');
  }
}
