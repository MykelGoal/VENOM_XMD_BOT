import { logger } from '../utils/logger';

/**
 * Central place to log/handle errors so a single bad command can never
 * crash the whole bot. Call installGlobalErrorHandlers() once at startup.
 */
export function installGlobalErrorHandlers(): void {
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
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
