import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import { afkRepo } from '../database/repositories/afk.repo';
import { jidToNumber } from '../utils/helpers';
import { fmtDuration } from '../database/repositories/economy.repo';

/**
 * Passive AFK handling, run on every incoming message:
 *  - If the sender was AFK, welcome them back and clear it.
 *  - If they mention (or reply to) an AFK user, announce that user is away.
 */
export async function handleAfk(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<void> {
  // Sender returns from AFK.
  const self = afkRepo.get(msg.senderNumber);
  if (self) {
    afkRepo.clear(msg.senderNumber);
    await sock.sendMessage(
      msg.chat,
      { text: `👋 Welcome back! You were AFK for ${fmtDuration(Date.now() - self.since)}.` },
      { quoted: msg.raw },
    );
  }

  // Someone pings an AFK user.
  const targets = new Set<string>(msg.mentions.map(jidToNumber));
  if (msg.quoted) targets.add(msg.quoted.senderNumber);

  for (const num of targets) {
    if (num === msg.senderNumber) continue;
    const info = afkRepo.get(num);
    if (info) {
      await sock.sendMessage(
        msg.chat,
        {
          text: `😴 @${num} is AFK: *${info.reason}*\n_(since ${fmtDuration(Date.now() - info.since)} ago)_`,
          mentions: [`${num}@s.whatsapp.net`],
        },
        { quoted: msg.raw },
      );
    }
  }
}
