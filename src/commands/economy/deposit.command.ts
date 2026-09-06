import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';

const deposit: Command = {
  name: 'deposit',
  aliases: ['dep'],
  category: 'economy',
  description: 'Deposit coins from wallet into your bank.',
  usage: 'deposit <amount|all>',
  async run({ sock, msg, args }) {
    const u = economyRepo.get(msg.senderNumber);
    const space = u.bankCap - u.bank;
    let amount =
      args[0]?.toLowerCase() === 'all'
        ? Math.min(u.wallet, space)
        : parseInt(args[0], 10);

    if (isNaN(amount) || amount <= 0) {
      await reply(sock, msg, 'ℹ️ Usage: *deposit <amount|all>*');
      return;
    }
    if (amount > u.wallet) {
      await reply(sock, msg, "❌ You don't have that much in your wallet.");
      return;
    }
    if (amount > space) {
      await reply(sock, msg, `❌ Bank full. Space left: ${CURRENCY} ${space.toLocaleString()}. Upgrade with .bankupgrade`);
      return;
    }
    u.wallet -= amount;
    u.bank += amount;
    economyRepo.save(u);
    await reply(sock, msg, `🏦 Deposited ${CURRENCY} ${amount.toLocaleString()}.\nBank: ${CURRENCY} ${u.bank.toLocaleString()}`);
  },
};

export default deposit;
