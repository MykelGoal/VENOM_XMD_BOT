import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { nekosBest, nekosia } from '../../services/anime.service';

interface AnimeImageOpts {
  name: string;
  aliases?: string[];
  description: string;
  emoji: string;
  /** Which source/category to pull from. */
  source: 'nekos-best' | 'nekosia';
  category: string;
}

/** Factory for simple "fetch a random anime image and send it" commands. */
export function makeAnimeImage(opts: AnimeImageOpts): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: 'anime',
    description: opts.description,
    usage: opts.name,
    async run({ sock, msg }) {
      await react(sock, msg, '⏳');
      try {
        const url =
          opts.source === 'nekos-best'
            ? await nekosBest(opts.category)
            : await nekosia(opts.category);
        await sock.sendMessage(
          msg.chat,
          { image: { url }, caption: `${opts.emoji} ${opts.name}` },
          { quoted: msg.raw },
        );
        await react(sock, msg, '✅');
      } catch {
        await react(sock, msg, '❌');
        await reply(sock, msg, `⚠️ Could not fetch a ${opts.name} image right now.`);
      }
    },
  };
}
