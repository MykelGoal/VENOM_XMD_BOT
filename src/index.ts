import { env } from './config';
import { logger } from './utils/logger';
import { installGlobalErrorHandlers } from './handlers/error.handler';
import { startConnection } from './core/connection';
import { restoreSessionFromEnv } from './core/session';
import { startKeepAlive } from './core/keepalive';
import { startMemorySync } from './services/memorysync.service';
import { initMongo, hydrateMirroredCollections } from './database/mongo';

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

  // If SESSION_ID is set, restore creds before connecting (skips QR/pairing).
  await restoreSessionFromEnv();

  // Optional: hydrate AI conversation memory from the remote store and keep
  // it synced (no-op unless the owner set MEMORY_URL).
  startMemorySync();

  // Optional MongoDB persistence for money records (wallets, ledger,
  // pending payments). Runs BEFORE the connection so the VTU payment
  // watcher resumes against fully-hydrated wallets. No-op without
  // MONGO_URI (local JSON files are used instead).
  await initMongo();
  await hydrateMirroredCollections();

  await startConnection();
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
