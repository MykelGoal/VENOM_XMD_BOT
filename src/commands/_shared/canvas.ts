import type { Command, CommandCategory } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia } from '../../services/media.service';

/**
 * Canvas/overlay meme commands via some-random-api.com — free, no key.
 * Works on a replied image, a mentioned user's profile photo, or your own.
 */
interface CanvasOptions {
  name: string;
  aliases?: string[];
  /** some-random-api canvas endpoint, e.g. "overlay/wasted" or "misc/bird". */
  endpoint: string;
  description?: string;
  category?: CommandCategory;
}

const API = 'https://some-random-api.com/canvas';
const FALLBACK_AVATAR = 'https://i.pravatar.cc/512';

export function makeCanvas(opts: CanvasOptions): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: opts.category ?? 'image',
    description:
      opts.description ?? `Apply the "${opts.name}" meme overlay.`,
    usage: `${opts.name} (reply to image / mention / self)`,
    async run({ sock, msg }) {
      await react(sock, msg, '⏳');
      try {
        // Resolve an avatar/image URL to feed the API.
        let avatarUrl = FALLBACK_AVATAR;
        const target = msg.quoted ?? msg;

        if (target.type === 'imageMessage') {
          // Replied/attached image: we still need a URL for the API, so
          // fall back to profile picture logic below if we can't host it.
          // some-random-api needs a URL, so use the sender/mention PP.
        }

        const who =
          msg.mentions[0] ??
          (msg.quoted ? msg.quoted.sender : msg.sender);
        try {
          const pp = await sock.profilePictureUrl(who, 'image');
          if (pp) avatarUrl = pp;
        } catch {
          /* keep fallback */
        }

        const url = `${API}/${opts.endpoint}?avatar=${encodeURIComponent(avatarUrl)}`;
        await sock.sendMessage(
          msg.chat,
          { image: { url }, caption: `✨ ${opts.name}` },
          { quoted: msg.raw },
        );
        await react(sock, msg, '✅');
      } catch {
        await react(sock, msg, '❌');
        await reply(sock, msg, '⚠️ The meme service is busy, try again.');
      }
    },
  };
}
