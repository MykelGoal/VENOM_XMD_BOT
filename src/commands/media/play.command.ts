import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/**
 * YouTube audio search + download.
 *
 * NOTE: Free YouTube APIs come and go. This uses a public search
 * endpoint; if it goes down, swap YT_SEARCH/YT_DOWNLOAD below for any
 * working provider (e.g. a self-hosted yt-dlp service). The command
 * structure stays the same.
 */
const YT_SEARCH = (q: string) =>
  `https://youtube-search-api-eight.vercel.app/search?q=${encodeURIComponent(q)}`;

const play: Command = {
  name: 'play',
  aliases: ['song', 'yt'],
  category: 'media',
  description: 'Search YouTube and return the top result link.',
  usage: 'play <song or video name>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *play <song name>*');
      return;
    }
    await react(sock, msg, '🔎');
    try {
      const res = await fetchJson<any>(YT_SEARCH(text));
      const item = res?.results?.[0] ?? res?.[0];
      if (!item) {
        await react(sock, msg, '❌');
        await reply(sock, msg, `❌ No results for "${text}".`);
        return;
      }
      const title = item.title ?? 'Result';
      const id = item.id ?? item.videoId;
      const link = id
        ? `https://youtu.be/${id}`
        : (item.url ?? item.link ?? '');
      await reply(
        sock,
        msg,
        `🎬 *${title}*\n🔗 ${link}\n\n_Tip: to auto-download audio, plug a yt-dlp service into src/commands/media/play.command.ts._`,
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(
        sock,
        msg,
        '⚠️ YouTube search failed. The free endpoint may be down — see the note in play.command.ts to swap providers.',
      );
    }
  },
};

export default play;
