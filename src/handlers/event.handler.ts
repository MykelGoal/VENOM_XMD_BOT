import type { WASocket } from '@whiskeysockets/baileys';
import { handleMessageUpsert } from './message.handler';
import { handleGroupParticipantsUpdate } from './group.handler';
import { safe } from './error.handler';

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
}
