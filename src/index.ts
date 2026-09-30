import { env } from './config';
import { logger } from './utils/logger';
import { installGlobalErrorHandlers } from './handlers/error.handler';
import { startConnection } from './core/connection';
import { restoreSessionFromEnv } from './core/session';
import { startKeepAlive } from './core/keepalive';
import { startMemorySync } from './services/memorysync.service';
import { initMongo, hydrateMirroredCollections } from './database/mongo';
import './database/repositories/register';
import { initBaileys } from './core/baileys';
import { restoreCompleteAuthState } from './core/auth-persistence';

const BANNER = `
╭──────────────────────────────╮
│        V E N O M - X M D      │
│     WhatsApp Bot • Baileys    │
╰──────────────────────────────╯
`;

async function main(): Promise<void> {
  console.log(BANNER);
  logger.info(`Starting ${env.botName}...`);
  logger.info(`Login method: ${env.loginMethod} | Prefix: "${env.prefix}"`);

  installGlobalErrorHandlers();

  // Baileys 6.7.19+ is ESM-only; load it through the native-import bridge
  // before any auth, serializer or socket code requests its runtime exports.
  await initBaileys();

  // OWNER_NUMBER is effectively required — without it, owner-only commands
  // refuse everyone. Warn loudly but still boot so the user can react.
  if (env.ownerNumbers.length === 0) {
    logger.warn(
      '⚠️  OWNER_NUMBER is not set — owner/admin commands will be disabled. ' +
        'Set OWNER_NUMBER in your .env (e.g. 2348012345678).',
    );
  }

  // Bind $PORT so free web hosts (Render/Koyeb/Railway) keep the app alive.
  startKeepAlive();

  // Mongo must be ready before auth restoration: the encrypted archive holds
  // creds plus every Signal/app-state key needed to decrypt incoming messages.
  await initMongo();
  await hydrateMirroredCollections();
  await restoreCompleteAuthState();

  // SESSION_ID remains the bootstrap/fallback. Older session IDs contain only
  // creds.json, so rotate/re-pair once after deploying complete persistence.
  await restoreSessionFromEnv();

  // Optional: hydrate AI conversation memory from the remote store and keep
  // it synced (no-op unless the owner set MEMORY_URL).
  startMemorySync();

  await startConnection();
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
