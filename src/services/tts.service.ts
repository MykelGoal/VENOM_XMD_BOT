/**
 * Free voice chain — turn text into a spoken MP3 buffer using a chain of
 * FREE providers so voice-note replies cost nothing:
 *
 *   1. Edge TTS  (Microsoft neural voices — NO API key, 322 voices incl.
 *                 Nigerian English en-NG-AbeoNeural / en-NG-EzinneNeural)
 *   2. Groq TTS  (Orpheus voices — the SAME free GROQ_API_KEY that powers
 *                 Whisper voice-note transcription; ~200 chars/request on
 *                 the free tier, so text is chunked at sentence bounds)
 *   3. Fish Audio (existing keyed path — used only when the deployer set
 *                 FISHAUDIO_API_KEY)
 *
 * Every provider normalises to MP3 so the caller can always send the result
 * as a WhatsApp voice note (ptt). The first provider that succeeds wins;
 * if all fail the caller falls back to a plain text reply.
 */
import axios from 'axios';
import { EdgeTTS } from 'edge-tts-universal';
import { env } from '../config';
import { logger } from '../utils/logger';
import { toMp3 } from './media.service';
import { speak as fishSpeak, isVoiceConfigured } from './voice.service';
import { effectiveAIKey } from './ai.service';

export type TtsProvider = 'edge' | 'groq' | 'fish';

export interface SpeakResult {
  /**
   * MP3 audio. Wrap with media.service's toVoiceNote() before sending as a
   * ptt voice note — MP3 ptt won't play on many devices (needs OGG/Opus).
   */
  audio: Buffer;
  /** Which provider produced the audio (for logging/diagnostics). */
  provider: TtsProvider;
}

/**
 * Strip things that sound terrible when spoken aloud: WhatsApp formatting
 * (*bold*, _italic_, ~strike~, `code`), emojis, URLs, and excess spaces.
 */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '') // URLs are meaningless read aloud
    .replace(/[*_~`]+/g, '') // WhatsApp formatting symbols
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '') // emoji / symbols
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split text into ≤maxLen chunks at sentence (then word) boundaries. */
export function chunkText(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]*/g) ?? [text];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).trim().length <= maxLen) {
      cur += s;
      continue;
    }
    if (cur.trim()) chunks.push(cur.trim());
    if (s.trim().length <= maxLen) {
      cur = s;
    } else {
      // Single sentence longer than the cap — hard-split at word bounds.
      let piece = '';
      for (const w of s.split(/\s+/)) {
        if ((piece + ' ' + w).trim().length > maxLen) {
          if (piece.trim()) chunks.push(piece.trim());
          piece = w;
        } else {
          piece = piece ? piece + ' ' + w : w;
        }
      }
      cur = piece;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

/** Edge TTS — free Microsoft neural voices, no API key. Returns MP3. */
async function edgeSpeak(text: string): Promise<Buffer> {
  const tts = new EdgeTTS(text, env.tts.edgeVoice);
  const result = await tts.synthesize();
  const raw: unknown = (result as { audio?: unknown })?.audio;
  if (!raw) throw new Error('edge-tts: no audio');

  // The library returns a Blob (or Buffer/Uint8Array depending on runtime).
  let wav: Buffer;
  if (Buffer.isBuffer(raw)) wav = raw;
  else if (raw instanceof Uint8Array) wav = Buffer.from(raw);
  else if (typeof Blob !== 'undefined' && raw instanceof Blob)
    wav = Buffer.from(await raw.arrayBuffer());
  else throw new Error('edge-tts: unexpected audio type');

  if (wav.length < 100) throw new Error('edge-tts: audio too small');
  // Edge returns WAV — normalise to MP3 like every other provider.
  return toMp3(wav);
}

/** Groq Orpheus TTS — free tier with the same key as Whisper. Returns MP3. */
async function groqSpeak(text: string): Promise<Buffer> {
  const apiKey = effectiveAIKey('groq');
  if (!apiKey) throw new Error('NO_GROQ_KEY');

  const baseUrl = env.ai.groq.baseUrl.replace(/\/$/, '');
  // Free tier caps each request (~200 chars) → chunk and concatenate.
  // MP3 is a frame stream, so concatenated per-chunk MP3s play seamlessly.
  const chunks = chunkText(text, env.tts.groqChunkChars);
  const parts: Buffer[] = [];
  for (const chunk of chunks) {
    const { data } = await axios.post(
      `${baseUrl}/audio/speech`,
      {
        model: 'canopylabs/orpheus-v1-english',
        voice: env.tts.groqVoice,
        input: chunk,
        response_format: 'wav',
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        responseType: 'arraybuffer',
        timeout: 60_000,
      },
    );
    parts.push(await toMp3(Buffer.from(data)));
  }
  if (!parts.length) throw new Error('groq-tts: no chunks');
  return Buffer.concat(parts);
}

/**
 * Speak text through the free chain: Edge → Groq → Fish.
 * Throws when every provider fails (caller falls back to a text reply).
 */
export async function speakText(text: string): Promise<SpeakResult> {
  const clean = cleanForSpeech(text);
  if (!clean) throw new Error('NOTHING_TO_SAY');

  // 1) Edge TTS — no key needed, works for every deployer out of the box.
  try {
    return { audio: await edgeSpeak(clean), provider: 'edge' };
  } catch (err) {
    logger.warn({ err }, 'tts chain: edge-tts failed, trying groq');
  }

  // 2) Groq Orpheus — the same free key that powers Whisper hearing.
  try {
    return { audio: await groqSpeak(clean), provider: 'groq' };
  } catch (err) {
    logger.warn({ err }, 'tts chain: groq tts failed, trying fish audio');
  }

  // 3) Fish Audio — optional keyed path (kept for deployers who have it).
  if (isVoiceConfigured()) {
    try {
      return { audio: await fishSpeak(clean, { format: 'mp3' }), provider: 'fish' };
    } catch (err) {
      logger.warn({ err }, 'tts chain: fish audio failed too');
    }
  }

  throw new Error('ALL_TTS_FAILED');
}

/** True when the answer is short enough to be spoken (humans send short voice notes). */
export function isSpeakableLength(text: string): boolean {
  return cleanForSpeech(text).length <= env.tts.maxSpeakChars && cleanForSpeech(text).length > 0;
}
