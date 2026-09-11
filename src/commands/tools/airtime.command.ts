import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import {
  vtuUnavailable,
  buyAirtime,
  initFund,
  walletRepo,
  naira,
  normalizePhone,
} from '../../services/vtu.service';

/**
 * Buy airtime at face value (Flutterwave's commission covers the fees).
 *   .airtime 500                → to your own number
 *   .airtime 500 08031234567    → to another number
 * Paid from wallet; insufficient balance → top-up link.
 */
const airtime: Command = {
  name: 'airtime',
  aliases: ['vtu', 'credit'],
  category: 'tools',
  description: 'Buy airtime (any network) at face value from your wallet.',
  usage: 'airtime <amount> [phone]',
  async run({ sock, msg, args }) {
    if (vtuUnavailable()) {
      await reply(sock, msg, vtuUnavailable()!);
      return;
    }

    const amount = Number(args[0]);
    const phone = args[1] ? normalizePhone(args[1]) : normalizePhone(msg.senderNumber);

    if (!Number.isFinite(amount) || amount < 50 || amount > 20000) {
      await reply(sock, msg, 'ℹ️ Usage: *airtime <₦50 – ₦20,000> [phone]*\n\nExample: _.airtime 500_');
      return;
    }
    if (!phone) {
      await reply(sock, msg, '📞 That phone number no correct. Use format like _08031234567_.');
      return;
    }

    await react(sock, msg, '⚡');
    const r = await buyAirtime(msg.senderNumber, amount, phone);
    if (r.ok) {
      await react(sock, msg, '✅');
      await reply(
        sock,
        msg,
        `✅ *Airtime delivered!*\n\n📞 ${phone}\n💸 ${naira(Math.round(amount * 100))} (wallet)\n💼 Balance: *${naira(walletRepo.balance(msg.senderNumber))}*\n🧾 ${r.txRef}`,
      );
    } else if (r.error === 'INSUFFICIENT') {
      const need = Math.round(amount * 100);
      try {
        const { link } = await initFund(msg.senderNumber, amount);
        await react(sock, msg, '🛒');
        await reply(
          sock,
          msg,
          `💼 Wallet balance: *${naira(walletRepo.balance(msg.senderNumber))}* — you need *${naira(need)}*.\n\nTop up here and try again:\n${link}`,
        );
      } catch {
        await react(sock, msg, '❌');
        await reply(sock, msg, `❌ Wallet too low (${naira(walletRepo.balance(msg.senderNumber))}) and I couldn't create a top-up link. Try again.`);
      }
    } else if (r.error === 'BAD_AMOUNT') {
      await react(sock, msg, '❌');
      await reply(sock, msg, 'ℹ️ Amount must be between ₦50 and ₦20,000.');
    } else {
      await react(sock, msg, '❌');
      await reply(sock, msg, `⚠️ Network no gree deliver the airtime — your money don return to your *wallet*. Try again shortly.`);
    }
  },
};

export default airtime;
