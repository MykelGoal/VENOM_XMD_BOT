import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** ip-api.com — free, no key (non-commercial). */
const ip: Command = {
  name: 'ip',
  aliases: ['iplookup'],
  category: 'tools',
  description: 'Look up geolocation info for an IP address.',
  usage: 'ip <address>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *ip <address>*');
      return;
    }
    try {
      const d = await fetchJson<any>(
        `http://ip-api.com/json/${encodeURIComponent(text.trim())}`,
      );
      if (d.status !== 'success') {
        await reply(sock, msg, `❌ Could not look up "${text}".`);
        return;
      }
      const out = [
        `🌐 *${d.query}*`,
        '',
        `📍 ${d.city}, ${d.regionName}, ${d.country}`,
        `🏢 ISP: ${d.isp}`,
        `🕒 Timezone: ${d.timezone}`,
      ].join('\n');
      await reply(sock, msg, out);
    } catch {
      await reply(sock, msg, '⚠️ IP lookup failed.');
    }
  },
};

export default ip;
