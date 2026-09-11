import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { vtuUnavailable, initFund, naira } from '../../services/vtu.service';

/**
 * Fund your Venom wallet via Flutterwave (bank transfer).
 *   .fund 2000 → payment link → wallet credits automatically on payment.
 * The bot watches the payment and messages you the moment it clears.
 */
const fund: Command = {
  name: 'fund',
  aliases: ['topup', 'fundwallet'],
  category: 'tools',
  description: 'Top up your Venom wallet (Flutterwave: card/transfer/USSD).',
  usage: 'fund <amount>',
  async run({ sock, msg, args }) {
    if (vtuUnavailable()) {
      await reply(sock, msg, vtuUnavailable()!);
      return;
    }

    const amount = Number(args[0]);
    if (!Number.isFinite(amount) || amount < 100 || amount > 100000) {
      await reply(sock, msg, 'ℹ️ Usage: *fund <₦100 – ₦100,000>*\n\nExample: _.fund 2000_');
      return;
    }

    await react(sock, msg, '💰');
    try {
      const { link } = await initFund(msg.senderNumber, amount);
      await react(sock, msg, '🔗');
      await reply(
        sock,
        msg,
        `💰 *Wallet Top-up — ${naira(Math.round(amount * 100))}*\n\n` +
          `Pay here (bank transfer):\n${link}\n\n` +
          `_The moment payment clear, your wallet go credit automatically — I dey watch am._ 👀`,
      );
    } catch (err) {
      await react(sock, msg, '❌');
      await reply(sock, msg, `❌ Couldn't create the payment link (${(err as Error).message.slice(0, 80)}). Try again shortly.`);
    }
  },
};

export default fund;
