import pino from 'pino';
import { env } from '../config';

/**
 * Central pino logger. Baileys also accepts a pino instance, so we
 * export a child for it to keep socket noise separate from app logs.
 */
export const logger = pino({
  level: env.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

/** A quieter child logger handed to the Baileys socket. */
export const waLogger = pino({ level: 'silent' });
