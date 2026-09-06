import type { Command, CommandCategory } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchJson, sendGifFromUrl } from '../../services/media.service';
import { numberToJid } from '../../utils/helpers';

/**
 * Anime reaction GIFs via otakugifs.xyz — free, no key, and its CDN is
 * hotlink-friendly (returns real image/gif bytes). We keep a `source`
 * field for future flexibility, but everything routes through otakugifs.
 */
type Source = 'otaku' | 'nekos';

interface ReactionOptions {
  name: string;
  aliases?: string[];
  category?: CommandCategory;
  /** Our internal category name (mapped to an otakugifs reaction below). */
  apiCategory: string;
  source?: Source;
  /** If set, this is a targeted action (e.g. "hugged"); caption tags people. */
  verb?: string;
  description?: string;
}

/** Map our category names → otakugifs reaction names. */
const OTAKU_MAP: Record<string, string> = {
  baka: 'mad', bite: 'bite', blush: 'blush', bored: 'tired', cry: 'cry',
  cuddle: 'cuddle', dance: 'dance', facepalm: 'facepalm', feed: 'nom',
  handhold: 'handhold', happy: 'happy', highfive: 'brofist', hug: 'hug',
  kiss: 'kiss', laugh: 'laugh', nod: 'yes', nom: 'nom', pat: 'pat',
  peck: 'airkiss', poke: 'poke', pout: 'pout', punch: 'punch',
  shrug: 'shrug', slap: 'slap', sleep: 'sleep', smile: 'smile',
  smug: 'smug', stare: 'stare', think: 'confused', thumbsup: 'thumbsup',
  tickle: 'tickle', wave: 'wave', wink: 'wink', yawn: 'yawn', yeet: 'punch',
  lick: 'lick', love: 'love', highfive2: 'brofist',
};

async function fetchGifUrl(apiCategory: string): Promise<string> {
  const reaction = OTAKU_MAP[apiCategory] ?? apiCategory;
  const d = await fetchJson<{ url: string }>(
    `https://api.otakugifs.xyz/gif?reaction=${reaction}`,
  );
  return d.url;
}

/** Builds a ready-to-export reaction Command. */
export function makeReaction(opts: ReactionOptions): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: opts.category ?? 'fun',
    description:
      opts.description ?? `Send a "${opts.name}" anime reaction GIF.`,
    usage: opts.verb ? `${opts.name} @user` : opts.name,
    async run({ sock, msg }) {
      await react(sock, msg, '⏳');
      try {
        const url = await fetchGifUrl(opts.apiCategory);
        if (!url) {
          await react(sock, msg, '❌');
          await reply(sock, msg, '⚠️ No GIF returned, try again.');
          return;
        }

        // Build a caption for targeted actions.
        let caption: string | undefined;
        const mentions: string[] = [];
        if (opts.verb) {
          const target =
            msg.mentions[0] ??
            (msg.quoted ? numberToJid(msg.quoted.senderNumber) : undefined);
          const actor = `@${msg.senderNumber}`;
          mentions.push(numberToJid(msg.senderNumber));
          if (target) {
            mentions.push(target);
            caption = `${actor} ${opts.verb} @${target.split('@')[0]} 💫`;
          } else {
            caption = `${actor} ${opts.verb} everyone 💫`;
          }
        }

        await sendGifFromUrl(async (mp4) => {
          await sock.sendMessage(
            msg.chat,
            {
              video: mp4,
              gifPlayback: true,
              caption,
              mentions: mentions.length ? mentions : undefined,
            },
            { quoted: msg.raw },
          );
        }, url);
        await react(sock, msg, '✅');
      } catch {
        await react(sock, msg, '❌');
        await reply(sock, msg, '⚠️ Reaction service is busy, try again.');
      }
    },
  };
}
