import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import type { AuthenticationState } from '@whiskeysockets/baileys';
import { PATHS } from '../config';

export interface AuthBundle {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}

/**
 * Loads (or creates) the multi-file auth state stored under /sessions.
 * Baileys writes creds + signal keys here so re-login isn't needed
 * every restart. This folder is gitignored — never commit it.
 */
export async function loadAuthState(): Promise<AuthBundle> {
  const { state, saveCreds } = await useMultiFileAuthState(PATHS.sessions);
  return { state, saveCreds };
}
