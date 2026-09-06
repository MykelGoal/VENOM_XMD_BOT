import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';
import { jidToNumber } from '../../utils/helpers';

const give: Command = {
  name: 'give',
  aliases: ['pay', 'transfer'],
  category: 'economy',
  description: 'Give coins to another user.',
  usage: 'give @user <amount>',
  async run({ sock, msg, args }) {
    const target = msg.mentions[0];
    if (!target) {
      await reply(sock, msg, 'ℹ️ Usage: *give @user <amount>*');
      return;
    }
    const amount = parseInt(args.find((a) => /^\d+$/.test(a)) ?? '', 10);
    if (isNaN(amount) || amount <= 0) {
      await reply(sock, msg, 'ℹ️ Enter a valid amount.');
      return;
    }
    const to = jidToNumber(target);
    if (to === msg.senderNumber) {
      await reply(sock, msg, "❌ You can't give to yourself.");
      return;
    }
    const ok = economyRepo.transfer(msg.senderNumber, to, amount);
    if (!ok) {
      await reply(sock, msg, "❌ You don't have enough coins.");
      return;
    }
    await sock.sendMessage(
      msg.chat,
      {
        text: `💸 You gave ${CURRENCY} ${amount.toLocaleString()} to @${to}.`,
        mentions: [target],
      },
      { quoted: msg.raw },
    );
  },
};

export default give;
