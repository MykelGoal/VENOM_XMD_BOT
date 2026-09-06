import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** Open Library — free, no key. */
const book: Command = {
  name: 'book',
  aliases: ['books'],
  category: 'search',
  description: 'Search for a book.',
  usage: 'book <title>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *book <title>*');
      return;
    }
    try {
      const d = await fetchJson<any>(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(text)}&limit=3`,
      );
      if (!d.docs?.length) {
        await reply(sock, msg, `❌ No books found for "${text}".`);
        return;
      }
      const out = d.docs
        .slice(0, 3)
        .map(
          (b: any, i: number) =>
            `${i + 1}. *${b.title}*\n   ✍️ ${(b.author_name ?? ['Unknown']).join(', ')}\n   📅 ${b.first_publish_year ?? '—'}`,
        )
        .join('\n\n');
      await reply(sock, msg, `📚 *Results for "${text}"*\n\n${out}`);
    } catch {
      await reply(sock, msg, '⚠️ Book search failed.');
    }
  },
};

export default book;
