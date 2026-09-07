import axios from 'axios';
import { env } from '../config';
import { logger } from '../utils/logger';
import { settingsRepo } from '../database/repositories/settings.repo';
import { VENOM_BRAIN } from './venom-brain';

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
const DEFAULT_SYSTEM = VENOM_BRAIN;

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
        model: env.ai.deepseek.model,
        baseUrl: env.ai.deepseek.baseUrl,
      }),
  },
  openrouter: {
    name: 'openrouter',
    hasKey: () => Boolean(effectiveAIKey('openrouter')),
    call: (o) =>
      openAICompatible(o, {
        apiKey: effectiveAIKey('openrouter'),
        model: env.ai.openrouter.model,
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
        model: env.ai.groq.model,
        baseUrl: env.ai.groq.baseUrl,
      }),
  },
  openai: {
    name: 'openai',
    hasKey: () => Boolean(effectiveAIKey('openai')),
    call: (o) =>
      openAICompatible(o, {
        apiKey: effectiveAIKey('openai'),
        model: env.ai.model,
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
      if (answer && answer.trim()) return answer.trim();
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
  return '⚠️ All AI providers are unavailable right now. Please try again later.';
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
        { role: 'system', content: opts.system ?? DEFAULT_SYSTEM },
        { role: 'user', content: opts.prompt },
      ],
      temperature: 0.7,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
        ...(cfg.extraHeaders ?? {}),
      },
      timeout: 60_000,
    },
  );
  return (
    data?.choices?.[0]?.message?.content?.trim() ??
    '🤖 (no response from the model)'
  );
}

async function geminiReply(opts: AIReplyOptions): Promise<string> {
  const model = env.ai.gemini.model;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:generateContent?key=${effectiveAIKey('gemini')}`;

  const { data } = await axios.post(
    url,
    {
      systemInstruction: {
        parts: [{ text: opts.system ?? DEFAULT_SYSTEM }],
      },
      contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 60_000 },
  );

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim();
  return text || '🤖 (no response from Gemini)';
}
