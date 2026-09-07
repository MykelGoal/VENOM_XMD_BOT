import axios from 'axios';
import FormData from 'form-data';
import { env } from '../config';
import { logger } from '../utils/logger';

/**
 * Fish Audio voice service — text-to-speech + instant voice cloning.
 *
 * Two capabilities:
 *   • speak(text, voiceId?)      → synthesize speech (optionally in a cloned voice)
 *   • cloneVoice(sample, title)  → create a reusable voice model from a sample,
 *                                  returns a reference_id you can pass to speak()
 *
 * The deployer supplies their own FISHAUDIO_API_KEY. The free developer tier
 * uses the 's2.1-pro-free' engine model. Docs: https://docs.fish.audio
 */

const REQUEST_TIMEOUT_MS = 60_000;

/** True when a Fish Audio key is configured. */
export function isVoiceConfigured(): boolean {
  return Boolean(env.fish.apiKey);
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${env.fish.apiKey}` };
}

export interface SpeakOptions {
  /** A Fish Audio voice model id (reference_id) — e.g. a cloned voice. */
  voiceId?: string;
  /** Output format. mp3 works everywhere; ogg/opus is best for WhatsApp PTT. */
  format?: 'mp3' | 'wav' | 'opus';
  /** Speaking rate multiplier (1 = normal). */
  speed?: number;
}

/**
 * Synthesize speech from text and return an audio Buffer.
 * If `voiceId` is provided, the speech is generated in that (possibly cloned)
 * voice; otherwise Fish's default voice (or FISHAUDIO_DEFAULT_VOICE) is used.
 *
 * @throws Error('NO_KEY') when no Fish Audio key is configured.
 */
export async function speak(
  text: string,
  opts: SpeakOptions = {},
): Promise<Buffer> {
  if (!isVoiceConfigured()) throw new Error('NO_KEY');

  const format = opts.format ?? 'mp3';
  const referenceId = opts.voiceId || env.fish.defaultVoice || undefined;

  const body: Record<string, unknown> = {
    text,
    format,
    normalize: true,
    prosody: { speed: opts.speed ?? 1, volume: 0 },
  };
  // Only attach reference_id when we actually have one (omitting it uses the
  // engine's built-in default voice).
  if (referenceId) body.reference_id = referenceId;

  const { data } = await axios.post(
    `${env.fish.baseUrl.replace(/\/$/, '')}/v1/tts`,
    body,
    {
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
        // Selects the TTS engine model (NOT the voice).
        model: env.fish.model,
      },
      responseType: 'arraybuffer',
      timeout: REQUEST_TIMEOUT_MS,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    },
  );

  return Buffer.from(data);
}

export interface CloneResult {
  /** The voice model id — pass this to speak() as voiceId. */
  id: string;
  title: string;
}

/**
 * Create a reusable voice model ("clone") from a reference audio sample.
 * Uses train_mode=fast so the model is usable immediately, and visibility
 * =private so clones never leak into Fish's public library.
 *
 * @param sample     Reference audio (mp3/wav/opus). 10–30s of clean speech.
 * @param title      A label for the model (e.g. the owner's name).
 * @param sampleText Optional transcript of the sample; if omitted, Fish runs
 *                   ASR on it automatically.
 * @throws Error('NO_KEY') when no Fish Audio key is configured.
 */
export async function cloneVoice(
  sample: Buffer,
  title: string,
  sampleText?: string,
): Promise<CloneResult> {
  if (!isVoiceConfigured()) throw new Error('NO_KEY');

  const form = new FormData();
  form.append('type', 'tts');
  form.append('title', title);
  form.append('train_mode', 'fast');
  form.append('visibility', 'private');
  form.append('enhance_audio_quality', 'true');
  form.append('voices', sample, { filename: 'sample.mp3', contentType: 'audio/mpeg' });
  if (sampleText) form.append('texts', sampleText);

  const { data } = await axios.post(
    `${env.fish.baseUrl.replace(/\/$/, '')}/model`,
    form,
    {
      headers: { ...authHeaders(), ...form.getHeaders() },
      timeout: REQUEST_TIMEOUT_MS,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    },
  );

  const id: string = data?._id ?? data?.id ?? '';
  if (!id) {
    logger.warn({ data }, 'Fish clone: no model id in response');
    throw new Error('NO_MODEL_ID');
  }
  return { id, title: data?.title ?? title };
}

/** Delete a previously created voice model (cleanup / management). */
export async function deleteVoice(id: string): Promise<void> {
  if (!isVoiceConfigured()) throw new Error('NO_KEY');
  await axios.delete(`${env.fish.baseUrl.replace(/\/$/, '')}/model/${id}`, {
    headers: authHeaders(),
    timeout: REQUEST_TIMEOUT_MS,
  });
}
