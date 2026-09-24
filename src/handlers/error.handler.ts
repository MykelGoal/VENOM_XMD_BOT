import { flushLocalCollections } from '../database';
import { logger } from '../utils/logger';

let installed = false;

/**
 * Central process-level error logging and local-data shutdown flushing.
 * Call once during startup.
 */
export function installGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.once('beforeExit', flushLocalCollections);

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      logger.info({ signal }, 'Shutting down gracefully');
      flushLocalCollections();
      process.exit(0);
    });
  }
}

/** Wrap any async unit of work with consistent error logging. */
export async function safe<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    logger.error({ err }, `Error in ${label}`);
    return undefined;
  }
}
