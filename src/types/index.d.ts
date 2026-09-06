// Global ambient declarations.

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_NAME?: string;
      PREFIX?: string;
      OWNER_NUMBER?: string;
      LOGIN_METHOD?: 'qr' | 'pairing' | 'both';
      PAIRING_NUMBER?: string;
      SESSION_ID?: string;
      SESSION_SITE_URL?: string;
      LOG_LEVEL?: string;
      COOLDOWN_MS?: string;
    }
  }
}

export {};
