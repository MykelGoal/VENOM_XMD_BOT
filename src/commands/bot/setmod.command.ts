import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { accessRepo } from '../../database/repositories/access.repo';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const setmod: Command = {
  name: 'setmod',
  aliases: ['addmod'],
  category: 'bot',
  description: 'Grant mod (helper) access to a user.',
  usage: 'setmod @user',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : args[0] ? numberToJid(args[0]) : undefined);
    if (!target) {
      await reply(sock, msg, 'ℹ️ Mention, reply, or pass a number.');
      return;
    }
    const num = jidToNumber(target);
    accessRepo.add(num, 'mod');
    await sock.sendMessage(
      msg.chat,
      { text: `🛡️ @${num} is now a *mod*.`, mentions: [target] },
      { quoted: msg.raw },
    );
  },
};

export default setmod;
