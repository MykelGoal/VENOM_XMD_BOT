import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { vtuUnavailable, walletRepo, naira, checkPendingFor } from '../../services/vtu.service';
import type { LedgerKind } from '../../database/repositories/wallet.repo';

/**
 * Your Venom wallet: balance + recent transactions.
 * Also re-checks any pending payments (if you paid a while ago and it
 * hasn't credited, .wallet forces a verification).
 */
const LEDGER_ICON: Record<LedgerKind, string> = {
  fund: '💰',
  purchase: '📶',
  refund: '↩️',
  direct: '🛒',
  adjustment: '🔧',
};

const walletCmd: Command = {
  name: 'wallet',
  aliases: ['balance', 'mywallet'],
  category: 'tools',
  description: 'Your Venom wallet — balance and recent transactions.',
  usage: 'wallet',
  async run({ sock, msg }) {
    if (vtuUnavailable()) {
      await reply(sock, msg, vtuUnavailable()!);
      return;
    }

    // Re-verify any open payments first — late payers get credited here.
    await checkPendingFor(msg.senderNumber);

    const balance = walletRepo.balance(msg.senderNumber);
    const history = walletRepo.history(msg.senderNumber, 5);

    const lines = history.map((h) => {
      const sign = h.amountKobo >= 0 ? '+' : '−';
      const amt = naira(Math.abs(h.amountKobo));
      return `${LEDGER_ICON[h.kind] ?? '•'} ${sign}${amt} — ${h.note || h.kind}`;
    });

    await reply(
      sock,
      msg,
      `💼 *Venom Wallet*\n\n` +
        `Balance: *${naira(balance)}*\n\n` +
        (lines.length ? `*Recent:*\n${lines.join('\n')}` : '_No transactions yet — start with .fund 500_') +
        `\n\n_💡 .fund to top up · .data to buy data · .airtime for credit_`,
    );
  },
};

export default walletCmd;
