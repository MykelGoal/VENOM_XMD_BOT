import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const getbio: Command = {
  name: 'getbio',
  aliases: ['getabout', 'userbio'],
  category: 'user',
  description: "Fetch a user's about/bio (mention, reply, or current chat).",
  usage: 'getbio [@user]',
  async run({ sock, msg }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : msg.isGroup ? msg.sender : msg.chat);
    await react(sock, msg, '⏳');
    try {
      const res = await sock.fetchStatus(target);
      const entry: any = Array.isArray(res) ? res[0] : res;
      const status = entry?.status?.status ?? entry?.status;
      const setAt = entry?.status?.setAt;
      if (!status) {
        await react(sock, msg, '❌');
        await reply(sock, msg, '🚫 No bio available (or it is private).');
        return;
      }
      const when = setAt ? `\n🕒 Set: ${new Date(setAt).toLocaleString()}` : '';
      await reply(sock, msg, `📝 *Bio of ${jidToNumber(target)}*\n\n${status}${when}`);
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '🚫 No bio available (or it is private).');
    }
  },
};

export default getbio;
