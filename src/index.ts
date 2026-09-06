import { env } from './config';
import { logger } from './utils/logger';
import { installGlobalErrorHandlers } from './handlers/error.handler';
import { startConnection } from './core/connection';
import { restoreSessionFromEnv } from './core/session';

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

  // If SESSION_ID is set, restore creds before connecting (skips QR/pairing).
  await restoreSessionFromEnv();

  await startConnection();
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
