import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import {
  vtuUnavailable,
  bundleByCode,
  purchaseWithWallet,
  initDirectBuy,
  walletRepo,
  naira,
  normalizePhone,
  Network,
} from '../../services/vtu.service';

/**
 * Buy a data bundle.
 *   .buydata mtn 2                    → code from .data mtn, to YOUR number
 *   .buydata mtn 2 08031234567        → deliver to another number
 * Wallet balance ≥ price → instant delivery.
 * No balance → a Flutterwave payment link for the exact price (buy-now).
 */
const buydata: Command = {
  name: 'buydata',
  aliases: ['data-buy', 'buy-data'],
  category: 'tools',
  description: 'Buy a data bundle (instant with wallet, or pay with a link).',
  usage: 'buydata <mtn|glo|airtel|9mobile> <code from .data> [phone]',
  async run({ sock, msg, args }) {
    if (vtuUnavailable()) {
      await reply(sock, msg, vtuUnavailable()!);
      return;
    }

    const NETWORKS: Record<string, Network> = {
      mtn: 'MTN',
      glo: 'Glo',
      airtel: 'Airtel',
      '9mobile': '9mobile',
      etisalat: '9mobile',
    };
    const network = NETWORKS[(args[0] ?? '').toLowerCase()];
    const code = Number(args[1]);
    const phone = args[2] ? normalizePhone(args[2]) : normalizePhone(msg.senderNumber);

    if (!network || !Number.isInteger(code) || code < 1) {
      await reply(
        sock,
        msg,
        'ℹ️ Usage: *buydata <network> <code> [phone]*\n\nExample: _.buydata mtn 2_\nSee codes with _.data mtn_',
      );
      return;
    }
    if (!phone) {
      await reply(sock, msg, '📞 That phone number no correct. Use format like _08031234567_.');
      return;
    }

    await react(sock, msg, '📶');
    const bundle = await bundleByCode(network, code);
    if (!bundle) {
      await react(sock, msg, '❌');
      await reply(sock, msg, `❌ No bundle with code *${code}* for ${network}. Check _.data ${args[0]?.toLowerCase()}_.`);
      return;
    }

    const price = bundle.priceKobo;
    const balance = walletRepo.balance(msg.senderNumber);

    // Fast lane: wallet balance covers it.
    if (balance >= price) {
      const r = await purchaseWithWallet(msg.senderNumber, bundle, phone);
      if (r.ok) {
        await react(sock, msg, '✅');
        await reply(
          sock,
          msg,
          `✅ *Delivered!*\n\n📶 ${bundle.network} • ${bundle.flwName}\n📞 ${phone}\n` +
            `💸 ${naira(price)} (wallet)\n💼 Balance: *${naira(walletRepo.balance(msg.senderNumber))}*\n🧾 ${r.txRef}`,
        );
      } else if (r.error === 'DELIVERY_FAILED') {
        await react(sock, msg, '❌');
        await reply(
          sock,
          msg,
          `⚠️ Network no gree deliver that one — your ${naira(price)} don return to your *wallet* sharp sharp. Try again or another bundle.`,
        );
      } else {
        await react(sock, msg, '❌');
        await reply(sock, msg, `❌ Wallet balance too low — you need ${naira(price)}. _.fund ${(price / 100).toFixed(0)}_ to top up.`);
      }
      return;
    }

    // Buy-now lane: payment link for the exact price.
    try {
      const { link } = await initDirectBuy(msg.senderNumber, bundle, phone);
      await react(sock, msg, '🛒');
      await reply(
        sock,
        msg,
        `🛒 *${bundle.network} • ${bundle.flwName}*\n📞 ${phone}\n💸 *${naira(price)}*\n\n` +
          `Pay here (card / transfer / USSD):\n${link}\n\n` +
          `_Once payment clear, the data deliver to ${phone} automatically._ 🔒`,
      );
    } catch (err) {
      await react(sock, msg, '❌');
      await reply(sock, msg, `❌ Could not start the purchase (${(err as Error).message.slice(0, 80)}). Try again shortly.`);
    }
  },
};

export default buydata;
