import type { WASocket } from '@whiskeysockets/baileys';
import { groupBrainRepo } from '../database/repositories/groupbrain.repo';
import { logger } from '../utils/logger';
import { formatLagosEvent } from './groupbrain.service';

const CHECK_INTERVAL_MS = 30_000;
const ADMIN_LEAD_MS = 30 * 60 * 1000;
const GROUP_LEAD_MS = 10 * 60 * 1000;
const CATCH_UP_MS = 2 * 60 * 60 * 1000;

let timer: NodeJS.Timeout | undefined;
let running = false;

async function remindRoomAdmins(
  sock: WASocket,
  numbers: string[],
  title: string,
  startsAt: number,
): Promise<boolean> {
  if (!numbers.length) return false;
  let sent = false;
  for (const number of numbers) {
    try {
      await sock.sendMessage(`${number}@s.whatsapp.net`, {
        text: `🎮 *Room preparation reminder*\n\n${title} starts ${formatLagosEvent(startsAt)}. Please prepare the custom room and send the room ID/password to the group when ready.`,
      });
      sent = true;
    } catch (err) {
      logger.debug({ err, number }, 'room-admin reminder failed');
    }
  }
  return sent;
}

/** One deterministic scan, exported for tests. */
export async function runGroupBrainReminderTick(
  sock: WASocket,
  now = Date.now(),
): Promise<number> {
  let sent = 0;
  for (const brain of groupBrainRepo.all()) {
    if (!brain.enabled) continue;
    for (const event of brain.events) {
      if (event.status !== 'scheduled') continue;
      const until = event.startsAt - now;

      if (
        !event.adminReminderSentAt &&
        until <= ADMIN_LEAD_MS &&
        until > 0 &&
        (await remindRoomAdmins(sock, brain.roomAdmins, event.title, event.startsAt))
      ) {
        groupBrainRepo.updateEvent(brain.jid, event.id, {
          adminReminderSentAt: now,
        });
        sent++;
      }

      if (!event.groupReminderSentAt && until <= GROUP_LEAD_MS && until > 0) {
        try {
          await sock.sendMessage(brain.jid, {
            text: `🎮 *${event.title} starts in about ${Math.max(1, Math.ceil(until / 60_000))} minutes.*\nRoom admins are preparing the ID and password.`,
          });
          groupBrainRepo.updateEvent(brain.jid, event.id, {
            groupReminderSentAt: now,
          });
          sent++;
        } catch (err) {
          logger.warn({ err, event: event.id }, 'group room-match reminder failed');
        }
      }

      if (!event.startNoticeSentAt && until <= 0 && until >= -CATCH_UP_MS) {
        const mentions = brain.roomAdmins.map((number) => `${number}@s.whatsapp.net`);
        try {
          await sock.sendMessage(brain.jid, {
            text: `🔥 *${event.title} time!*${brain.roomAdmins.length ? `\n${brain.roomAdmins.map((number) => `@${number}`).join(' ')} please share the room ID and password when ready.` : '\nAn admin can now share the room ID and password.'}`,
            mentions,
          });
          groupBrainRepo.updateEvent(brain.jid, event.id, {
            startNoticeSentAt: now,
            status: 'completed',
          });
          sent++;
        } catch (err) {
          logger.warn({ err, event: event.id }, 'room-match start notice failed');
        }
      } else if (until < -CATCH_UP_MS) {
        groupBrainRepo.updateEvent(brain.jid, event.id, { status: 'completed' });
      }
    }
  }
  return sent;
}

/** Start one reconnect-safe scheduler. */
export function startGroupBrainReminderLoop(sock: WASocket): void {
  if (timer) clearInterval(timer);
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runGroupBrainReminderTick(sock);
    } finally {
      running = false;
    }
  };
  void tick();
  timer = setInterval(() => void tick(), CHECK_INTERVAL_MS);
  timer.unref?.();
}
