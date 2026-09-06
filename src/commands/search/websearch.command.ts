import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** DuckDuckGo Instant Answer API — free, no key. */
const websearch: Command = {
  name: 'websearch',
  aliases: ['ddg', 'search'],
  category: 'search',
  description: 'Quick web instant-answer search (DuckDuckGo).',
  usage: 'websearch <query>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *websearch <query>*');
      return;
    }
    try {
      const d = await fetchJson<any>(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(text)}&format=json&no_html=1&skip_disambig=1`,
      );
      let out = '';
      if (d.AbstractText) {
        out = `🔎 *${d.Heading}*\n\n${d.AbstractText}\n\n🔗 ${d.AbstractURL}`;
      } else if (d.RelatedTopics?.length) {
        const topics = d.RelatedTopics.filter((t: any) => t.Text)
          .slice(0, 4)
          .map((t: any) => `• ${t.Text}`)
          .join('\n');
        out = `🔎 *${text}*\n\n${topics}`;
      }
      await reply(
        sock,
        msg,
        out || `🔎 No instant answer for "${text}". Try a broader term.`,
      );
    } catch {
      await reply(sock, msg, '⚠️ Web search failed.');
    }
  },
};

export default websearch;
