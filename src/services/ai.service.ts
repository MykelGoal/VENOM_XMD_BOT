import axios from 'axios';
import FormData from 'form-data';
import { env } from '../config';
import { logger } from '../utils/logger';
import { settingsRepo } from '../database/repositories/settings.repo';
import { buildVenomBrain } from './venom-brain';
import { toWhatsApp } from '../utils/waformat';

/**
 * Multi-provider AI reply service with automatic fallback.
 *
 * Supported providers (add a key for ANY of them, in env vars — never in code):
 *   - deepseek    → DeepSeek         (OpenAI-compatible)
 *   - gemini      → Google Gemini
 *   - openrouter  → OpenRouter       (OpenAI-compatible, has free models)
 *   - groq        → Groq             (OpenAI-compatible, fast, free tier)
 *   - openai      → OpenAI / any OpenAI-compatible endpoint (AI_BASE_URL)
 *
 * The bot tries providers in the order set by AI_ORDER and returns the first
 * successful answer. If a provider is down / rate-limited / missing a key, it
 * automatically falls through to the next one. This is why we combine them:
 * resilience and free-tier coverage.
 */

export interface AIReplyOptions {
  prompt: string;
  system?: string;
}

// The Venom Brain — full identity, knowledge & personality (see venom-brain.ts).
// Built at request time so live command counts are always accurate.
const DEFAULT_SYSTEM = () => buildVenomBrain();

/* ─── Speed tuning ───────────────────────────────────────────────────────
 * A shorter per-provider timeout means a stuck/overloaded provider gives up
 * fast and we fall back to the next one instead of the user waiting ~1 min.
 * max_tokens caps reply length so generation finishes quickly (WhatsApp
 * replies should be short anyway).
 */
const REQUEST_TIMEOUT_MS = 18_000;
const MAX_TOKENS = 512;

/* ─── Runtime key layer (.setkey) ────────────────────────────────────────
 * Keys set via the .setkey owner command are persisted in the settings
 * store and ALWAYS win over env variables — so owners can add/replace
 * keys from WhatsApp without touching the host dashboard or redeploying.
 */

export const AI_PROVIDER_NAMES: readonly string[] = [
  'deepseek',
  'gemini',
  'openrouter',
  'groq',
  'openai',
];

/** Env-variable key for each provider (fallback when no runtime key). */
const ENV_KEYS: Record<string, () => string> = {
  deepseek: () => env.ai.deepseek.apiKey,
  gemini: () => env.ai.gemini.apiKey,
  openrouter: () => env.ai.openrouter.apiKey,
  groq: () => env.ai.groq.apiKey,
  openai: () => env.ai.apiKey,
};

/**
 * The actual host env-variable NAME each provider reads its key from.
 * Used to persist a `.setkey` value to the host platform (Render) so it
 * survives redeploys. Mirrors the `optional(...)` names in config/env.ts.
 */
const ENV_KEY_NAMES: Record<string, string> = {
  deepseek: 'DEEPSEEK_API_KEY',
  gemini: 'GEMINI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  groq: 'GROQ_API_KEY',
  openai: 'AI_API_KEY',
};

/** Host env-variable name for a provider's API key (or undefined). */
export function envKeyNameFor(provider: string): string | undefined {
  return ENV_KEY_NAMES[provider.toLowerCase()];
}

const runtimeKeyVar = (provider: string) => `ai.key.${provider.toLowerCase()}`;

/** Key set at runtime via .setkey, if any. */
export function getRuntimeAIKey(provider: string): string | undefined {
  return settingsRepo.get(runtimeKeyVar(provider));
}

/** Persist a runtime key (takes effect immediately). */
export function setRuntimeAIKey(provider: string, key: string): void {
  settingsRepo.set(runtimeKeyVar(provider), key);
}

/** Remove a runtime key. Returns true if one was stored. */
export function removeRuntimeAIKey(provider: string): boolean {
  return settingsRepo.delete(runtimeKeyVar(provider));
}

/** Runtime key if set, otherwise the env-variable key. */
function effectiveAIKey(provider: string): string {
  return getRuntimeAIKey(provider) || ENV_KEYS[provider]?.() || '';
}

/** Env-variable model default for each provider. */
const ENV_MODELS: Record<string, () => string> = {
  deepseek: () => env.ai.deepseek.model,
  gemini: () => env.ai.gemini.model,
  openrouter: () => env.ai.openrouter.model,
  groq: () => env.ai.groq.model,
  openai: () => env.ai.model,
};

const runtimeModelVar = (provider: string) =>
  `ai.model.${provider.toLowerCase()}`;

/** Model set at runtime via `.setkey <provider> model <name>`, if any. */
export function getRuntimeAIModel(provider: string): string | undefined {
  return settingsRepo.get(runtimeModelVar(provider));
}

/** Persist a runtime model (takes effect immediately). */
export function setRuntimeAIModel(provider: string, model: string): void {
  settingsRepo.set(runtimeModelVar(provider), model);
}

/** Runtime model if set, otherwise the env/default model. */
function effectiveAIModel(provider: string): string {
  return (getRuntimeAIModel(provider) || '').trim() || ENV_MODELS[provider]?.() || '';
}

/** Mask a key for display: AIzaSy••••••8f2q */
export function maskKey(key: string): string {
  if (key.length <= 10) return `${key.slice(0, 2)}••••••`;
  return `${key.slice(0, 6)}••••••${key.slice(-4)}`;
}

/** Provider config: which have keys, and how to call them. */
interface ProviderCfg {
  name: string;
  hasKey: () => boolean;
  call: (opts: AIReplyOptions) => Promise<string>;
}

const PROVIDERS: Record<string, ProviderCfg> = {
  deepseek: {
    name: 'deepseek',
    hasKey: () => Boolean(effectiveAIKey('deepseek')),
    call: (o) =>
      openAICompatible(o, {
        apiKey: effectiveAIKey('deepseek'),
        model: effectiveAIModel('deepseek'),
        baseUrl: env.ai.deepseek.baseUrl,
      }),
  },
  openrouter: {
    name: 'openrouter',
    hasKey: () => Boolean(effectiveAIKey('openrouter')),
    call: (o) =>
      openAICompatible(o, {
        apiKey: effectiveAIKey('openrouter'),
        model: effectiveAIModel('openrouter'),
        baseUrl: env.ai.openrouter.baseUrl,
        extraHeaders: {
          'HTTP-Referer': 'https://github.com/MykelGoal/VENOM_XMD_BOT',
          'X-Title': env.botName,
        },
      }),
  },
  groq: {
    name: 'groq',
    hasKey: () => Boolean(effectiveAIKey('groq')),
    call: (o) =>
      openAICompatible(o, {
        apiKey: effectiveAIKey('groq'),
        model: effectiveAIModel('groq'),
        baseUrl: env.ai.groq.baseUrl,
      }),
  },
  openai: {
    name: 'openai',
    hasKey: () => Boolean(effectiveAIKey('openai')),
    call: (o) =>
      openAICompatible(o, {
        apiKey: effectiveAIKey('openai'),
        model: effectiveAIModel('openai'),
        baseUrl: env.ai.baseUrl,
      }),
  },
  gemini: {
    name: 'gemini',
    hasKey: () => Boolean(effectiveAIKey('gemini')),
    call: (o) => geminiReply(o),
  },
};

/** Ordered list of providers that actually have a key configured. */
function activeProviders(): ProviderCfg[] {
  // Start from AI_ORDER, then append any not listed, then keep only keyed ones.
  const order = [...env.ai.order];
  for (const name of Object.keys(PROVIDERS)) {
    if (!order.includes(name)) order.push(name);
  }
  // Honour AI_PROVIDER as a top preference if set and keyed.
  if (env.ai.provider && order.includes(env.ai.provider)) {
    order.sort((a, b) =>
      a === env.ai.provider ? -1 : b === env.ai.provider ? 1 : 0,
    );
  }
  return order
    .map((n) => PROVIDERS[n])
    .filter((p): p is ProviderCfg => Boolean(p) && p.hasKey());
}

export function isAIConfigured(): boolean {
  return activeProviders().length > 0;
}

/** List configured provider names (for status/diagnostics commands). */
export function configuredProviders(): string[] {
  return activeProviders().map((p) => p.name);
}

export async function getAIReply(opts: AIReplyOptions): Promise<string> {
  const providers = activeProviders();
  if (providers.length === 0) {
    return (
      '🤖 AI is not configured yet.\n\n' +
      'Add ONE (or more) of these keys:\n' +
      '• DEEPSEEK_API_KEY\n• GEMINI_API_KEY\n• OPENROUTER_API_KEY\n' +
      '• GROQ_API_KEY\n• AI_API_KEY (OpenAI-compatible)\n\n' +
      '_Owner: set one instantly from WhatsApp with_ `.setkey gemini <key>` _— no restart needed. ' +
      'Or add it in your host dashboard / .env (never in the code)._'
    );
  }

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const answer = await provider.call(opts);
      if (answer && answer.trim()) return toWhatsApp(answer.trim());
      errors.push(`${provider.name}: empty response`);
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? `${err.response?.status ?? ''} ${
            typeof err.response?.data === 'object'
              ? JSON.stringify(err.response?.data).slice(0, 200)
              : err.message
          }`
        : String(err);
      logger.warn(`AI provider "${provider.name}" failed → ${detail}`);
      errors.push(`${provider.name}: ${detail}`);
      // fall through to the next provider
    }
  }

  logger.error({ errors }, 'All AI providers failed');

  // Surface a short, useful reason instead of a dead-end message.
  const first = errors[0] ?? '';
  let hint = '';
  if (/model.*(not|does not) exist|model_not_found|not found/i.test(first)) {
    hint =
      '\n\n🧩 Looks like a *wrong model name*. Fix it with e.g.\n' +
      '`.setkey groq model openai/gpt-oss-120b`\n' +
      '`.setkey gemini model gemini-flash-latest`';
  } else if (/401|403|api key|invalid.*key|unauthor/i.test(first)) {
    hint = '\n\n🔑 Looks like an *invalid key*. Re-set it with `.setkey <provider> <key>`.';
  } else if (/429|quota|rate/i.test(first)) {
    hint = '\n\n⏳ Rate-limited / out of quota. Try again shortly or add another provider.';
  } else if (/503|overload|unavailable|high demand/i.test(first)) {
    hint = '\n\n📡 The provider is temporarily overloaded. Try again in a moment.';
  }

  return (
    `⚠️ AI request failed on: ${providers.map((p) => p.name).join(', ')}.` +
    hint +
    `\n\n_Owner: run *.aistatus* or *.setkey list* to check keys & models._`
  );
}

/** Call any OpenAI-compatible /chat/completions endpoint. */
async function openAICompatible(
  opts: AIReplyOptions,
  cfg: {
    apiKey: string;
    model: string;
    baseUrl: string;
    extraHeaders?: Record<string, string>;
  },
): Promise<string> {
  const { data } = await axios.post(
    `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      model: cfg.model,
      messages: [
        { role: 'system', content: opts.system ?? DEFAULT_SYSTEM() },
        { role: 'user', content: opts.prompt },
      ],
      temperature: 0.7,
      max_tokens: MAX_TOKENS,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
        ...(cfg.extraHeaders ?? {}),
      },
      timeout: REQUEST_TIMEOUT_MS,
    },
  );
  return (
    data?.choices?.[0]?.message?.content?.trim() ??
    '🤖 (no response from the model)'
  );
}

async function geminiReply(opts: AIReplyOptions): Promise<string> {
  const key = effectiveAIKey('gemini');
  const primary = effectiveAIModel('gemini');
  // If the configured model is congested (503), fall back to the lite model,
  // then the current 3.x flash — so "high demand" spikes don't kill Gemini.
  const chain = [primary, 'gemini-flash-lite-latest', 'gemini-3.6-flash'].filter(
    (m, i, a) => m && a.indexOf(m) === i,
  );

  let lastErr: unknown;
  for (const model of chain) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${model}:generateContent?key=${key}`;
    try {
      const { data } = await axios.post(
        url,
        {
          systemInstruction: { parts: [{ text: opts.system ?? DEFAULT_SYSTEM() }] },
          contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
          generationConfig: { maxOutputTokens: MAX_TOKENS },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: REQUEST_TIMEOUT_MS },
      );
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('')
        .trim();
      if (text) return text;
      lastErr = new Error('empty response');
    } catch (err) {
      lastErr = err;
      const status =
        (err as { response?: { status?: number } })?.response?.status ?? 0;
      // Only try the next model on congestion/not-found; otherwise stop.
      if (status !== 503 && status !== 404 && status !== 429) throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Gemini unavailable');
}

/** True when a Groq key is available (Whisper speech-to-text needs it). */
export function isTranscriptionConfigured(): boolean {
  return Boolean(effectiveAIKey('groq'));
}

export interface TranscribeOptions {
  /** Force translation to English instead of transcribing in-language. */
  translate?: boolean;
  /** Optional BCP-47 / ISO-639-1 language hint (e.g. 'en', 'es'). */
  language?: string;
  /** Filename hint for the multipart upload (affects nothing but logs). */
  filename?: string;
}

/**
 * Transcribe (or translate) an audio buffer to text using Groq Whisper.
 * Uses the OpenAI-compatible /audio/transcriptions | /audio/translations
 * endpoints on Groq — fast and free-tier friendly. Requires GROQ_API_KEY.
 *
 * @throws Error('NO_KEY') when no Groq key is configured.
 */
export async function transcribeAudio(
  audio: Buffer,
  opts: TranscribeOptions = {},
): Promise<string> {
  const apiKey = effectiveAIKey('groq');
  if (!apiKey) throw new Error('NO_KEY');

  const baseUrl = env.ai.groq.baseUrl.replace(/\/$/, '');
  const endpoint = opts.translate
    ? `${baseUrl}/audio/translations`
    : `${baseUrl}/audio/transcriptions`;

  const form = new FormData();
  form.append('file', audio, { filename: opts.filename ?? 'audio.mp3' });
  form.append('model', env.ai.groq.sttModel);
  form.append('response_format', 'json');
  // /audio/translations always outputs English and rejects a language param.
  if (!opts.translate && opts.language) {
    form.append('language', opts.language);
  }

  const { data } = await axios.post(endpoint, form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` },
    timeout: 60_000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return (data?.text ?? '').trim();
}

/** Vision-capable providers, in preference order, with their model + caller. */
const VISION_PROVIDERS: Array<{
  name: string;
  hasKey: () => boolean;
  call: (imgB64: string, mime: string, prompt: string) => Promise<string>;
}> = [
  {
    name: 'gemini',
    hasKey: () => Boolean(effectiveAIKey('gemini')),
    call: (imgB64, mime, prompt) => geminiVision(imgB64, mime, prompt),
  },
  {
    name: 'openai',
    hasKey: () => Boolean(effectiveAIKey('openai')),
    call: (imgB64, mime, prompt) =>
      openAIVision(imgB64, mime, prompt, {
        apiKey: effectiveAIKey('openai'),
        model: effectiveAIModel('openai'),
        baseUrl: env.ai.baseUrl,
      }),
  },
  {
    name: 'openrouter',
    hasKey: () => Boolean(effectiveAIKey('openrouter')),
    call: (imgB64, mime, prompt) =>
      openAIVision(imgB64, mime, prompt, {
        apiKey: effectiveAIKey('openrouter'),
        model: effectiveAIModel('openrouter'),
        baseUrl: env.ai.openrouter.baseUrl,
        extraHeaders: {
          'HTTP-Referer': 'https://github.com/MykelGoal/VENOM_XMD_BOT',
          'X-Title': env.botName,
        },
      }),
  },
];

/** True when at least one vision-capable provider has a key. */
export function isVisionConfigured(): boolean {
  return VISION_PROVIDERS.some((p) => p.hasKey());
}

/** Names of vision-capable providers that are keyed (diagnostics). */
export function configuredVisionProviders(): string[] {
  return VISION_PROVIDERS.filter((p) => p.hasKey()).map((p) => p.name);
}

/**
 * Analyse an image with a vision model and answer a text prompt about it.
 * Tries each keyed vision provider in order until one succeeds.
 *
 * @throws Error('NO_VISION') when no vision-capable provider is configured.
 */
export async function analyzeImage(
  image: Buffer,
  prompt: string,
  mime = 'image/jpeg',
): Promise<string> {
  const providers = VISION_PROVIDERS.filter((p) => p.hasKey());
  if (providers.length === 0) throw new Error('NO_VISION');

  const b64 = image.toString('base64');
  let lastErr: unknown;
  for (const p of providers) {
    try {
      const out = await p.call(b64, mime, prompt);
      if (out) return out;
    } catch (err) {
      lastErr = err;
      logger.warn({ err, provider: p.name }, 'vision provider failed');
    }
  }
  throw lastErr ?? new Error('All vision providers failed.');
}

async function geminiVision(
  imgB64: string,
  mime: string,
  prompt: string,
): Promise<string> {
  const model = effectiveAIModel('gemini');
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:generateContent?key=${effectiveAIKey('gemini')}`;

  const { data } = await axios.post(
    url,
    {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mime, data: imgB64 } },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: MAX_TOKENS },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: REQUEST_TIMEOUT_MS },
  );

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim();
  return text || '';
}

async function openAIVision(
  imgB64: string,
  mime: string,
  prompt: string,
  cfg: {
    apiKey: string;
    model: string;
    baseUrl: string;
    extraHeaders?: Record<string, string>;
  },
): Promise<string> {
  const { data } = await axios.post(
    `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      model: cfg.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:${mime};base64,${imgB64}` },
            },
          ],
        },
      ],
      max_tokens: MAX_TOKENS,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
        ...(cfg.extraHeaders ?? {}),
      },
      timeout: REQUEST_TIMEOUT_MS,
    },
  );
  return data?.choices?.[0]?.message?.content?.trim() ?? '';
}
