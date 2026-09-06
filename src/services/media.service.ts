import { downloadMediaMessage } from '@whiskeysockets/baileys';
import type { proto } from '@whiskeysockets/baileys';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import axios from 'axios';
import { env } from '../config';
import { waLogger } from '../utils/logger';

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
