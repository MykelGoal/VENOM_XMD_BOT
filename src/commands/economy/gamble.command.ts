import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';

const gamble: Command = {
  name: 'gamble',
  aliases: ['bet'],
  category: 'economy',
  description: 'Gamble coins for a chance to double them.',
  usage: 'gamble <amount|all>',
  async run({ sock, msg, args }) {
    const u = economyRepo.get(msg.senderNumber);
    const amount =
      args[0]?.toLowerCase() === 'all' ? u.wallet : parseInt(args[0], 10);
    if (isNaN(amount) || amount <= 0) {
      await reply(sock, msg, 'ℹ️ Usage: *gamble <amount|all>*');
      return;
    }
    if (amount > u.wallet) {
      await reply(sock, msg, "❌ You don't have that much.");
      return;
    }
    const win = Math.random() < 0.48;
    if (win) {
      u.wallet += amount;
      economyRepo.save(u);
      await reply(sock, msg, `🎉 You won! +${CURRENCY} ${amount.toLocaleString()}\nWallet: ${CURRENCY} ${u.wallet.toLocaleString()}`);
    } else {
      u.wallet -= amount;
      economyRepo.save(u);
      await reply(sock, msg, `💸 You lost ${CURRENCY} ${amount.toLocaleString()}.\nWallet: ${CURRENCY} ${u.wallet.toLocaleString()}`);
    }
  },
};

export default gamble;
