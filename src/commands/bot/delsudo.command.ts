import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { accessRepo } from '../../database/repositories/access.repo';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const delsudo: Command = {
  name: 'delsudo',
  aliases: ['removesudo'],
  category: 'bot',
  description: 'Revoke sudo access from a user.',
  usage: 'delsudo @user',
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
    const ok = accessRepo.remove(num, 'sudo');
    await reply(sock, msg, ok ? `✅ Removed sudo from ${num}.` : `❌ ${num} was not a sudo user.`);
  },
};

export default delsudo;
