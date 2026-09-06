import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** Wikipedia REST summary API — free, no key. */
const wiki: Command = {
  name: 'wiki',
  aliases: ['wikipedia'],
  category: 'tools',
  description: 'Get a Wikipedia summary for a topic.',
  usage: 'wiki <topic>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *wiki <topic>*');
      return;
    }
    try {
      const data = await fetchJson<any>(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`,
      );
      if (data.type === 'disambiguation' || !data.extract) {
        await reply(sock, msg, `❌ No clear article for "${text}".`);
        return;
      }
      await reply(
        sock,
        msg,
        `📖 *${data.title}*\n\n${data.extract}\n\n🔗 ${data.content_urls?.desktop?.page ?? ''}`,
      );
    } catch {
      await reply(sock, msg, `❌ Couldn't find "${text}" on Wikipedia.`);
    }
  },
};

export default wiki;
