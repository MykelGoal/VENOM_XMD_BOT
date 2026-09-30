import type { AuthenticationState } from '@whiskeysockets/baileys';
import { PATHS } from '../config';
import { getBaileys } from './baileys';
import {
  persistCompleteAuthState,
  scheduleCompleteAuthStatePersistence,
} from './auth-persistence';
import { logger } from '../utils/logger';

export interface AuthBundle {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}

async function persistSafely(reason: string): Promise<void> {
  try {
    await persistCompleteAuthState();
  } catch (err) {
    logger.error(
      { err, reason },
      'Complete WhatsApp auth state could not be persisted to MongoDB; do not redeploy until storage is healthy.',
    );
  }
}

/**
 * Loads Baileys' multi-file state and mirrors the COMPLETE state (creds,
 * Signal sessions/pre-keys and app-state sync keys) as an encrypted MongoDB
 * archive. Persisting creds.json alone can connect and send a welcome after a
 * redeploy while incoming encrypted messages remain undecryptable/one-tick.
 */
export async function loadAuthState(): Promise<AuthBundle> {
  const { useMultiFileAuthState } = getBaileys();
  const local = await useMultiFileAuthState(PATHS.sessions);

  // Signal/app-state keys change independently of creds.update. Wrap the key
  // store itself so each committed key mutation also updates the secure blob.
  const originalSet = local.state.keys.set.bind(local.state.keys);
  local.state.keys.set = async (data) => {
    await originalSet(data);
    scheduleCompleteAuthStatePersistence();
  };

  const saveCreds = async (): Promise<void> => {
    await local.saveCreds();
    await persistSafely('creds.update');
  };

  return { state: local.state, saveCreds };
}
