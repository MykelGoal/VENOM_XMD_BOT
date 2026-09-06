import type { WASocket } from '@whiskeysockets/baileys';
import { handleMessageUpsert } from './message.handler';
import { handleGroupParticipantsUpdate } from './group.handler';
import { handleCall } from './call.handler';
import { handleAntiDelete } from './antidelete.handler';
import { safe } from './error.handler';
import { settingsRepo } from '../database/repositories/settings.repo';
import { logger } from '../utils/logger';

/**
 * Binds all sock.ev listeners in one place. Called once per socket
 * (including after reconnects, which create a fresh socket).
 */
export function registerEventHandlers(sock: WASocket): void {
  sock.ev.on('messages.upsert', (upsert) =>
    safe('messages.upsert', () => handleMessageUpsert(sock, upsert)),
  );

  sock.ev.on('group-participants.update', (update) =>
    safe('group-participants.update', () =>
      handleGroupParticipantsUpdate(sock, update),
    ),
  );

  sock.ev.on('call', (calls) =>
    safe('call', () => handleCall(sock, calls as any)),
  );

  sock.ev.on('messages.update', (updates) =>
    safe('messages.update', async () => {
      for (const u of updates) await handleAntiDelete(sock, u as any);
    }),
  );

  // Keep the bot's presence "online" when alwaysonline is enabled.
  startPresenceLoop(sock);
}

let presenceTimer: NodeJS.Timeout | undefined;

function startPresenceLoop(sock: WASocket): void {
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = setInterval(() => {
    if (settingsRepo.getBool('alwaysonline')) {
      sock
        .sendPresenceUpdate('available')
        .catch((err) => logger.debug({ err }, 'presence update failed'));
    }
  }, 30_000);
}
