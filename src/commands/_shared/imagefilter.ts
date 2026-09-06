import type { Command, CommandCategory } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, applyImageFilter } from '../../services/media.service';
import type { ImageFilter } from '../../services/media.service';

interface FilterOptions {
  name: string;
  aliases?: string[];
  filter: ImageFilter;
  description?: string;
  category?: CommandCategory;
}

/**
 * Builds an image-filter command. The user replies to (or attaches) an
 * image; we download it, run it through sharp, and send the result.
 */
export function makeImageFilter(opts: FilterOptions): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: opts.category ?? 'image',
    description: opts.description ?? `Apply the "${opts.name}" filter to an image.`,
    usage: `${opts.name} (reply to an image)`,
    async run({ sock, msg }) {
      const target = msg.quoted ?? msg;
      if (target.type !== 'imageMessage') {
        await reply(sock, msg, `ℹ️ Reply to an image with *${opts.name}*.`);
        return;
      }
      await react(sock, msg, '⏳');
      try {
        const buf = await downloadMedia(target.raw);
        const out = await applyImageFilter(buf, opts.filter);
        await sock.sendMessage(
          msg.chat,
          { image: out, caption: `✨ ${opts.name}` },
          { quoted: msg.raw },
        );
        await react(sock, msg, '✅');
      } catch {
        await react(sock, msg, '❌');
        await reply(sock, msg, '❌ Could not process that image.');
      }
    },
  };
}
