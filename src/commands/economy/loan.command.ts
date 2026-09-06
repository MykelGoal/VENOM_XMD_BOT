import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';

const MAX_LOAN = 5000;

const loan: Command = {
  name: 'loan',
  aliases: ['borrow'],
  category: 'economy',
  description: 'Take a loan (max 5,000). Pay it back with .payloan.',
  usage: 'loan <amount>',
  async run({ sock, msg, args }) {
    const u = economyRepo.get(msg.senderNumber);
    const amount = parseInt(args[0], 10);
    if (isNaN(amount) || amount <= 0) {
      await reply(sock, msg, 'ℹ️ Usage: *loan <amount>*');
      return;
    }
    if (u.loan > 0) {
      await reply(sock, msg, `❌ You already owe ${CURRENCY} ${u.loan.toLocaleString()}. Pay it first with .payloan`);
      return;
    }
    if (amount > MAX_LOAN) {
      await reply(sock, msg, `❌ Max loan is ${CURRENCY} ${MAX_LOAN.toLocaleString()}.`);
      return;
    }
    u.wallet += amount;
    u.loan = Math.floor(amount * 1.1); // 10% interest
    economyRepo.save(u);
    await reply(sock, msg, `🏦 Loan approved: ${CURRENCY} ${amount.toLocaleString()}.\nYou owe ${CURRENCY} ${u.loan.toLocaleString()} (10% interest).`);
  },
};

export default loan;
