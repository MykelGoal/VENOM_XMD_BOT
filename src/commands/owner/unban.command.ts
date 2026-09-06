import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { userRepo } from '../../database/repositories/user.repo';
import { jidToNumber } from '../../utils/helpers';

const unban: Command = {
  name: 'unban',
  category: 'owner',
  description: 'Unban a previously banned user.',
  usage: 'unban @user',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const number =
      msg.mentions[0] != null
        ? jidToNumber(msg.mentions[0])
        : msg.quoted
          ? msg.quoted.senderNumber
          : args[0]?.replace(/[^0-9]/g, '');

    if (!number) {
      await reply(sock, msg, 'ℹ️ Mention, reply, or pass a number to unban.');
      return;
    }
    userRepo.unban(number);
    await reply(sock, msg, `✅ Unbanned *${number}*.`);
  },
};

export default unban;
