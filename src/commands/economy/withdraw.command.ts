import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';

const withdraw: Command = {
  name: 'withdraw',
  aliases: ['wd'],
  category: 'economy',
  description: 'Withdraw coins from your bank into your wallet.',
  usage: 'withdraw <amount|all>',
  async run({ sock, msg, args }) {
    const u = economyRepo.get(msg.senderNumber);
    let amount =
      args[0]?.toLowerCase() === 'all' ? u.bank : parseInt(args[0], 10);

    if (isNaN(amount) || amount <= 0) {
      await reply(sock, msg, 'ℹ️ Usage: *withdraw <amount|all>*');
      return;
    }
    if (amount > u.bank) {
      await reply(sock, msg, "❌ You don't have that much in your bank.");
      return;
    }
    u.bank -= amount;
    u.wallet += amount;
    economyRepo.save(u);
    await reply(sock, msg, `🏦 Withdrew ${CURRENCY} ${amount.toLocaleString()}.\nWallet: ${CURRENCY} ${u.wallet.toLocaleString()}`);
  },
};

export default withdraw;
