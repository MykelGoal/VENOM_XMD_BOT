import dotenv from 'dotenv';

dotenv.config();

/**
 * Reads a required env var, throwing a clear error if it is missing.
 */
function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`[config] Missing required environment variable: ${key}`);
  }
  return value;
}

/** Reads an optional env var with a fallback. */
function optional(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

/** Parse a boolean-ish env value. */
function bool(key: string, fallback = false): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export type LoginMethod = 'qr' | 'pairing' | 'both';

export const env = {
  botName: optional('BOT_NAME', 'VENOM-XMD'),
  prefix: optional('PREFIX', '.'),
  ownerNumbers: optional('OWNER_NUMBER', '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean),
  loginMethod: optional('LOGIN_METHOD', 'both') as LoginMethod,
  pairingNumber: optional('PAIRING_NUMBER', ''),
  logLevel: optional('LOG_LEVEL', 'info'),
  cooldownMs: parseInt(optional('COOLDOWN_MS', '3000'), 10),

  // Menu banner image shown at the top of the .menu command.
  // Local assets/logo.png is used automatically when present; this URL is the
  // fallback (and lets deployers swap in their own banner without a rebuild).
  menuImage: optional(
    'MENU_IMAGE_URL',
    'https://raw.githubusercontent.com/MykelGoal/VENOM_XMD_BOT/main/assets/logo.png',
  ),

  // Pre-authenticated session (paste from the VENOM session site)
  session: {
    id: optional('SESSION_ID', ''),
    siteUrl: optional('SESSION_SITE_URL', 'https://session-site-2odn.onrender.com'),
  },

  // AI — multi-provider with automatic fallback.
  // Add a key for ANY of these (in env vars, never in code!). The bot tries
  // them in AI_ORDER and uses the first one that answers, so if one is down
  // or out of quota it automatically falls back to the next.
  ai: {
    // Preferred primary provider (kept for backward compatibility).
    // Groq is fast + reliable, so it leads; others are automatic backups.
    provider: optional('AI_PROVIDER', 'groq'),
    autoReply: bool('AI_AUTO_REPLY', false),
    // Comma-separated fallback order. Only providers with a key are tried.
    // Groq first (fastest), then Gemini, then the rest.
    order: optional('AI_ORDER', 'groq,gemini,openrouter,deepseek,openai')
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean),

    // Generic OpenAI-compatible endpoint (OpenAI itself, or any compatible API)
    apiKey: optional('AI_API_KEY', ''),
    model: optional('AI_MODEL', 'gpt-4o-mini'),
    baseUrl: optional('AI_BASE_URL', 'https://api.openai.com/v1'),

    // DeepSeek (OpenAI-compatible)
    deepseek: {
      apiKey: optional('DEEPSEEK_API_KEY', ''),
      model: optional('DEEPSEEK_MODEL', 'deepseek-chat'),
      baseUrl: optional('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
    },
    // OpenRouter (OpenAI-compatible; gateway to many models, has free ones)
    openrouter: {
      apiKey: optional('OPENROUTER_API_KEY', ''),
      model: optional('OPENROUTER_MODEL', 'deepseek/deepseek-chat-v3.1:free'),
      baseUrl: optional('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
    },
    // Groq (OpenAI-compatible; very fast, has a free tier).
    // Default model 'openai/gpt-oss-120b' is widely available on Groq; the
    // older 'llama-3.3-70b-versatile' 404s on many newer accounts.
    groq: {
      apiKey: optional('GROQ_API_KEY', ''),
      model: optional('GROQ_MODEL', 'openai/gpt-oss-120b'),
      baseUrl: optional('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
      // Speech-to-text model used for voice-note transcription (Whisper).
      sttModel: optional('GROQ_STT_MODEL', 'whisper-large-v3'),
    },
    // Google Gemini
    gemini: {
      apiKey: optional('GEMINI_API_KEY', ''),
      // 'gemini-flash-latest' auto-tracks the newest Flash model — Google
      // retires specific versions (e.g. gemini-1.5-flash is gone), so the
      // alias keeps working without code changes.
      model: optional('GEMINI_MODEL', 'gemini-flash-latest'),
    },
  },

  // Fish Audio — text-to-speech + instant voice cloning.
  // The deployer brings their OWN key (console.fish.audio → API keys); the
  // free developer tier uses the 's2.1-pro-free' model. Cloning is gated to
  // the owner/sudo by default (see .clonevoice) to prevent abuse/deepfakes.
  fish: {
    apiKey: optional('FISHAUDIO_API_KEY', ''),
    baseUrl: optional('FISHAUDIO_BASE_URL', 'https://api.fish.audio'),
    // TTS engine model (NOT the voice). s2.1-pro-free = free dev tier.
    model: optional('FISHAUDIO_MODEL', 's2.1-pro-free'),
    // Optional default voice model ID used by .tts when the caller has no
    // personal clone. Leave blank to use Fish's built-in default voice.
    defaultVoice: optional('FISHAUDIO_DEFAULT_VOICE', ''),
  },

  // remove.bg API key for .nobg background removal (optional).
  // Free key (50 images/mo) at remove.bg — recommended on low-RAM free hosts
  // where the local ONNX model gets OOM-killed. If unset, .nobg falls back to
  // the bundled local model (needs ~1-2GB RAM).
  removebgApiKey: optional('REMOVEBG_API_KEY', ''),

  // Social / growth stats (all optional).
  social: {
    // GitHub repo to track stars/forks (owner/name). No key needed.
    githubRepo: optional('GITHUB_REPO', 'MykelGoal/VENOM_XMD_BOT'),
    // YouTube: free key from console.cloud.google.com (YouTube Data API v3).
    youtubeApiKey: optional('YOUTUBE_API_KEY', ''),
    youtubeChannelId: optional('YOUTUBE_CHANNEL_ID', ''),
    // Public handles / links for display + CTAs.
    youtubeHandle: optional('YOUTUBE_HANDLE', '@venommdbot'),
    tiktokHandle: optional('TIKTOK_HANDLE', '@venomxmd'),
  },

  // Sticker
  sticker: {
    pack: optional('STICKER_PACK', 'VENOM-XMD'),
    author: optional('STICKER_AUTHOR', 'venom'),
  },
} as const;

// Validate login configuration early so failures are obvious.
if (env.loginMethod === 'pairing' && !env.pairingNumber) {
  throw new Error(
    '[config] LOGIN_METHOD is "pairing" but PAIRING_NUMBER is not set.',
  );
}
