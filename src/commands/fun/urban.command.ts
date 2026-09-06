import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** Urban Dictionary — free, no key. */
const urban: Command = {
  name: 'urban',
  aliases: ['ud', 'urbandict'],
  category: 'fun',
  description: 'Look up a term on Urban Dictionary.',
  usage: 'urban <term>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *urban <term>*');
      return;
    }
    try {
      const d = await fetchJson<any>(
        `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(text)}`,
      );
      const item = d?.list?.[0];
      if (!item) {
        await reply(sock, msg, `❌ No definition for "${text}".`);
        return;
      }
      const clean = (s: string) => s.replace(/[[\]]/g, '');
      await reply(
        sock,
        msg,
        `📚 *${item.word}*\n\n${clean(item.definition)}\n\n_Example:_ ${clean(item.example || '—')}\n\n👍 ${item.thumbs_up} | 👎 ${item.thumbs_down}`,
      );
    } catch {
      await reply(sock, msg, '⚠️ Urban Dictionary lookup failed.');
    }
  },
};

export default urban;
