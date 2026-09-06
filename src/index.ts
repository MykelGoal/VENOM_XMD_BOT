import { env } from './config';
import { logger } from './utils/logger';
import { installGlobalErrorHandlers } from './handlers/error.handler';
import { startConnection } from './core/connection';

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
  await startConnection();
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
