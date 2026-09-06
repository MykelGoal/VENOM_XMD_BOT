import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';
import { jidToNumber } from '../../utils/helpers';

const addmoney: Command = {
  name: 'addmoney',
  aliases: ['givemoney', 'setmoney'],
  category: 'economy',
  description: 'Owner: add coins to a user\'s wallet.',
  usage: 'addmoney @user <amount>',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const target = msg.mentions[0];
    const amount = parseInt(args.find((a) => /^-?\d+$/.test(a)) ?? '', 10);
    if (!target || isNaN(amount)) {
      await reply(sock, msg, 'ℹ️ Usage: *addmoney @user <amount>*');
      return;
    }
    const num = jidToNumber(target);
    economyRepo.addWallet(num, amount);
    await sock.sendMessage(
      msg.chat,
      {
        text: `✅ Added ${CURRENCY} ${amount.toLocaleString()} to @${num}.`,
        mentions: [target],
      },
      { quoted: msg.raw },
    );
  },
};

export default addmoney;
