import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { userRepo } from '../../database/repositories/user.repo';
import { jidToNumber } from '../../utils/helpers';

const ban: Command = {
  name: 'ban',
  category: 'owner',
  description: 'Ban a user from using the bot. Mention/reply/number.',
  usage: 'ban @user',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const number =
      msg.mentions[0] != null
        ? jidToNumber(msg.mentions[0])
        : msg.quoted
          ? msg.quoted.senderNumber
          : args[0]?.replace(/[^0-9]/g, '');

    if (!number) {
      await reply(sock, msg, 'ℹ️ Mention, reply, or pass a number to ban.');
      return;
    }
    userRepo.ban(number);
    await reply(sock, msg, `🚫 Banned *${number}* from using the bot.`);
  },
};

export default ban;
