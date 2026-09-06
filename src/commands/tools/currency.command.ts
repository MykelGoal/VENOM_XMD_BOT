import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** open.er-api.com — free, no key currency conversion. */
const currency: Command = {
  name: 'currency',
  aliases: ['convert', 'exchange'],
  category: 'tools',
  description: 'Convert between currencies.',
  usage: 'currency <amount> <from> <to>  e.g. currency 100 usd ngn',
  async run({ sock, msg, args }) {
    const amount = parseFloat(args[0]);
    const from = args[1]?.toUpperCase();
    const to = args[2]?.toUpperCase();
    if (isNaN(amount) || !from || !to) {
      await reply(sock, msg, 'ℹ️ Usage: *currency 100 usd ngn*');
      return;
    }
    try {
      const d = await fetchJson<any>(
        `https://open.er-api.com/v6/latest/${from}`,
      );
      const rate = d?.rates?.[to];
      if (!rate) {
        await reply(sock, msg, `❌ Unknown currency code "${to}".`);
        return;
      }
      const result = (amount * rate).toFixed(2);
      await reply(
        sock,
        msg,
        `💱 *${amount} ${from}* = *${result} ${to}*\n(rate: ${rate})`,
      );
    } catch {
      await reply(sock, msg, '⚠️ Currency conversion failed.');
    }
  },
};

export default currency;
