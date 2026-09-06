import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { animeInfo, ratingOutOf10 } from '../../services/anime.service';

const anime: Command = {
  name: 'anime',
  aliases: ['animeinfo'],
  category: 'anime',
  description: 'Look up an anime (info, rating, synopsis, poster).',
  usage: 'anime <title>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *anime <title>*\n\nExample: _anime naruto_');
      return;
    }
    await react(sock, msg, '🔎');
    try {
      const a = await animeInfo(text);
      const caption = [
        `🎌 *${a.title}*`,
        a.japanese ? `🇯🇵 ${a.japanese}` : '',
        '',
        `📺 Type: ${a.type?.toUpperCase() || 'N/A'}`,
        `📊 Status: ${a.status || 'N/A'}`,
        `🎬 Episodes: ${a.episodes ?? 'N/A'}`,
        `⭐ Rating: ${ratingOutOf10(a.rating)}`,
        a.ageRating ? `🔞 Age: ${a.ageRating}` : '',
        a.aired ? `📅 Aired: ${a.aired}` : '',
        '',
        `📝 ${a.synopsis ? a.synopsis.slice(0, 600) : 'No synopsis.'}`,
      ]
        .filter(Boolean)
        .join('\n');
      if (a.poster) {
        await sock.sendMessage(
          msg.chat,
          { image: { url: a.poster }, caption },
          { quoted: msg.raw },
        );
      } else {
        await reply(sock, msg, caption);
      }
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, `❌ No anime found for "${text}".`);
    }
  },
};

export default anime;
