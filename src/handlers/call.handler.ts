import type { WASocket } from '@whiskeysockets/baileys';
import { settingsRepo } from '../database/repositories/settings.repo';
import { logger } from '../utils/logger';

interface CallEvent {
  id: string;
  from: string;
  status: string;
}

/**
 * Auto-rejects incoming calls when the "rejectcall" setting is on, and
 * warns the caller. Bound to the sock 'call' event.
 */
export async function handleCall(
  sock: WASocket,
  calls: CallEvent[],
): Promise<void> {
  if (!settingsRepo.getBool('rejectcall')) return;

  for (const call of calls) {
    if (call.status !== 'offer') continue;
    try {
      await sock.rejectCall(call.id, call.from);
      await sock.sendMessage(call.from, {
        text: '📵 Sorry, calls are not allowed. This bot auto-rejects them.',
      });
      logger.debug(`Rejected call from ${call.from}`);
    } catch (err) {
      logger.error({ err }, 'Failed to reject call');
    }
  }
}
