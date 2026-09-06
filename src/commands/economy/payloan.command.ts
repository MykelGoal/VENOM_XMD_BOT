import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';

const payloan: Command = {
  name: 'payloan',
  aliases: ['repay'],
  category: 'economy',
  description: 'Repay your outstanding loan.',
  usage: 'payloan <amount|all>',
  async run({ sock, msg, args }) {
    const u = economyRepo.get(msg.senderNumber);
    if (u.loan <= 0) {
      await reply(sock, msg, '✅ You have no loan to repay.');
      return;
    }
    let amount =
      args[0]?.toLowerCase() === 'all'
        ? Math.min(u.loan, u.wallet)
        : parseInt(args[0], 10);
    if (isNaN(amount) || amount <= 0) {
      await reply(sock, msg, 'ℹ️ Usage: *payloan <amount|all>*');
      return;
    }
    if (amount > u.wallet) {
      await reply(sock, msg, "❌ You don't have that much.");
      return;
    }
    amount = Math.min(amount, u.loan);
    u.wallet -= amount;
    u.loan -= amount;
    economyRepo.save(u);
    await reply(
      sock,
      msg,
      u.loan > 0
        ? `💵 Paid ${CURRENCY} ${amount.toLocaleString()}. Remaining loan: ${CURRENCY} ${u.loan.toLocaleString()}.`
        : `✅ Loan fully repaid! You're debt-free.`,
    );
  },
};

export default payloan;
