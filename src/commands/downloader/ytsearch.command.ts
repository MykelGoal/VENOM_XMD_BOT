import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { ytSearch, formatViews } from '../../services/download.service';

const ytsearch: Command = {
  name: 'ytsearch',
  aliases: ['yts', 'ytfind'],
  category: 'downloader',
  description: 'Search YouTube and list the top results (no download).',
  usage: 'ytsearch <query>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *ytsearch <query>*');
      return;
    }
    await react(sock, msg, '🔎');
    try {
      const list = await ytSearch(text, 8);
      if (!list.length) {
        await reply(sock, msg, `🔎 No results for "${text}".`);
        return;
      }
      const out = list
        .map(
          (v, i) =>
            `*${i + 1}.* ${v.title}\n   👤 ${v.author}  •  ⏱️ ${v.duration}  •  👁️ ${formatViews(
              v.views,
            )}\n   🔗 ${v.url}`,
        )
        .join('\n\n');
      await reply(sock, msg, `🔎 *YouTube results for* "${text}"\n\n${out}\n\n💡 _Use *play <title>* or *video <title>* to download._`);
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '⚠️ YouTube search failed.');
    }
  },
};

export default ytsearch;
