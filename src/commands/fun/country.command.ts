import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** restcountries.com — free, no key. */
const country: Command = {
  name: 'country',
  aliases: ['countryinfo'],
  category: 'fun',
  description: 'Get information about a country.',
  usage: 'country <name>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *country <name>*');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const arr = await fetchJson<any[]>(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(text)}`,
      );
      const c = arr[0];
      const caption = [
        `${c.flag} *${c.name.common}* (${c.name.official})`,
        '',
        `🏙️ Capital: ${c.capital?.[0] ?? 'N/A'}`,
        `🌍 Region: ${c.region} (${c.subregion ?? '—'})`,
        `👥 Population: ${c.population.toLocaleString()}`,
        `💱 Currency: ${Object.values(c.currencies ?? {}).map((x: any) => x.name).join(', ')}`,
        `🗣️ Languages: ${Object.values(c.languages ?? {}).join(', ')}`,
      ].join('\n');
      if (c.flags?.png) {
        await sock.sendMessage(
          msg.chat,
          { image: { url: c.flags.png }, caption },
          { quoted: msg.raw },
        );
      } else {
        await reply(sock, msg, caption);
      }
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, `❌ Country "${text}" not found.`);
    }
  },
};

export default country;
