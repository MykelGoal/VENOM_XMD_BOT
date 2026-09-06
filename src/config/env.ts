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

  // Pre-authenticated session (paste from the VENOM session site)
  session: {
    id: optional('SESSION_ID', ''),
    siteUrl: optional('SESSION_SITE_URL', 'https://session-site-2odn.onrender.com'),
  },

  // AI
  ai: {
    provider: optional('AI_PROVIDER', 'openai'),
    apiKey: optional('AI_API_KEY', ''),
    model: optional('AI_MODEL', 'gpt-4o-mini'),
    baseUrl: optional('AI_BASE_URL', 'https://api.openai.com/v1'),
    autoReply: bool('AI_AUTO_REPLY', false),
    gemini: {
      apiKey: optional('GEMINI_API_KEY', ''),
      model: optional('GEMINI_MODEL', 'gemini-1.5-flash'),
    },
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
