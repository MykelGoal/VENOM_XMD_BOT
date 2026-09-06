import { downloadMediaMessage } from '@whiskeysockets/baileys';
import type { proto } from '@whiskeysockets/baileys';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
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
