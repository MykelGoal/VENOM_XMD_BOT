import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { mangaInfo, ratingOutOf10 } from '../../services/anime.service';

const manga: Command = {
  name: 'manga',
  aliases: ['mangainfo'],
  category: 'anime',
  description: 'Look up a manga (info, rating, synopsis, cover).',
  usage: 'manga <title>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *manga <title>*\n\nExample: _manga berserk_');
      return;
    }
    await react(sock, msg, '🔎');
    try {
      const m = await mangaInfo(text);
      const caption = [
        `📖 *${m.title}*`,
        m.japanese ? `🇯🇵 ${m.japanese}` : '',
        '',
        `📚 Type: ${m.type?.toUpperCase() || 'N/A'}`,
        `📊 Status: ${m.status || 'N/A'}`,
        `📑 Chapters: ${m.chapters ?? 'N/A'}`,
        `📦 Volumes: ${m.volumes ?? 'N/A'}`,
        `⭐ Rating: ${ratingOutOf10(m.rating)}`,
        m.aired ? `📅 Published: ${m.aired}` : '',
        '',
        `📝 ${m.synopsis ? m.synopsis.slice(0, 600) : 'No synopsis.'}`,
      ]
        .filter(Boolean)
        .join('\n');
      if (m.poster) {
        await sock.sendMessage(
          msg.chat,
          { image: { url: m.poster }, caption },
          { quoted: msg.raw },
        );
      } else {
        await reply(sock, msg, caption);
      }
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, `❌ No manga found for "${text}".`);
    }
  },
};

export default manga;
