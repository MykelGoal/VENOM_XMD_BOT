import makeWASocket, {
  Browsers,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import { waLogger, logger } from '../utils/logger';
import { loadAuthState } from './auth';
import type { AuthBundle } from './auth';

export interface CreatedClient {
  sock: WASocket;
  auth: AuthBundle;
}

/**
 * Builds and returns a configured Baileys socket. Connection events
 * (QR, reconnect, pairing) are wired up separately in connection.ts.
 */
export async function createClient(): Promise<CreatedClient> {
  const auth = await loadAuthState();
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`Using WA v${version.join('.')} (latest: ${isLatest})`);

  const sock = makeWASocket({
    version,
    logger: waLogger,
    // We render the QR ourselves in connection.ts for nicer output.
    printQRInTerminal: false,
    auth: auth.state,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
  });

  return { sock, auth };
}
