import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const getpp: Command = {
  name: 'getpp',
  aliases: ['pp', 'getprofilepic'],
  category: 'user',
  description: "Fetch a user's profile picture (mention, reply, or current chat).",
  usage: 'getpp [@user]',
  async run({ sock, msg }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : msg.isGroup ? msg.sender : msg.chat);
    await react(sock, msg, '⏳');
    try {
      const url = await sock.profilePictureUrl(target, 'image');
      if (!url) {
        await react(sock, msg, '❌');
        await reply(sock, msg, '🚫 No profile picture (or it is private).');
        return;
      }
      await sock.sendMessage(
        msg.chat,
        { image: { url }, caption: `🖼️ Profile picture of ${jidToNumber(target)}` },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '🚫 No profile picture (or it is private).');
    }
  },
};

export default getpp;
