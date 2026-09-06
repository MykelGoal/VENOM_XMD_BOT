import type { Command } from '../../types/command.type';
import { reply, sendText } from '../../services/message.service';
import { sleep } from '../../utils/helpers';

const broadcast: Command = {
  name: 'broadcast',
  aliases: ['bc'],
  category: 'owner',
  description: 'Send a message to all groups the bot is in.',
  usage: 'broadcast <message>',
  ownerOnly: true,
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: broadcast <message>');
      return;
    }

    const groups = await sock.groupFetchAllParticipating();
    const jids = Object.keys(groups);

    await reply(sock, msg, `📢 Broadcasting to ${jids.length} groups...`);

    let sent = 0;
    for (const jid of jids) {
      try {
        await sendText(sock, jid, `📢 *Broadcast*\n\n${text}`);
        sent++;
        await sleep(1200); // gentle throttle to avoid rate limits
      } catch {
        /* skip failures */
      }
    }

    await reply(sock, msg, `✅ Broadcast delivered to ${sent}/${jids.length}.`);
  },
};

export default broadcast;
