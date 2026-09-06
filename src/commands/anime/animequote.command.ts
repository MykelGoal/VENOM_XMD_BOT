import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { animeQuote } from '../../services/anime.service';

const animequote: Command = {
  name: 'animequote',
  aliases: ['aquote', 'aq'],
  category: 'anime',
  description: 'Get a random anime quote.',
  usage: 'animequote',
  async run({ sock, msg }) {
    await react(sock, msg, '💭');
    try {
      const q = await animeQuote();
      await reply(
        sock,
        msg,
        `💭 _"${q.quote}"_\n\n— *${q.character}*\n🎌 ${q.anime}`,
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '⚠️ Could not fetch an anime quote right now.');
    }
  },
};

export default animequote;
