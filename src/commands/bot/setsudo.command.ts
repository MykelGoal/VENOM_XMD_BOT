import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { accessRepo } from '../../database/repositories/access.repo';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const setsudo: Command = {
  name: 'setsudo',
  aliases: ['addsudo'],
  category: 'bot',
  description: 'Grant sudo (near-owner) access to a user.',
  usage: 'setsudo @user',
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
    accessRepo.add(num, 'sudo');
    await sock.sendMessage(
      msg.chat,
      { text: `👑 @${num} is now a *sudo* user.`, mentions: [target] },
      { quoted: msg.raw },
    );
  },
};

export default setsudo;
