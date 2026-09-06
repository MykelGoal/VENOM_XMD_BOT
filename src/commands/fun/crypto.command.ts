import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** coingecko — free, no key. */
const crypto: Command = {
  name: 'crypto',
  aliases: ['coin', 'price'],
  category: 'fun',
  description: 'Get the current price of a cryptocurrency.',
  usage: 'crypto <bitcoin|ethereum|...>',
  async run({ sock, msg, text }) {
    const id = (text || 'bitcoin').toLowerCase().trim();
    try {
      const d = await fetchJson<any>(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`,
      );
      const info = d[id];
      if (!info) {
        await reply(sock, msg, `❌ Unknown coin "${id}" (use the full id, e.g. bitcoin).`);
        return;
      }
      const change = info.usd_24h_change?.toFixed(2) ?? '0';
      const arrow = Number(change) >= 0 ? '📈' : '📉';
      await reply(
        sock,
        msg,
        `💰 *${id.toUpperCase()}*\n\n💵 $${info.usd.toLocaleString()}\n${arrow} 24h: ${change}%`,
      );
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch crypto price right now.');
    }
  },
};

export default crypto;
