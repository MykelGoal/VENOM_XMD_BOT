import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, makeSticker } from '../../services/media.service';
import { env } from '../../config';

/**
 * Re-brand a replied sticker (or image) with a custom pack/author.
 * Usage: take <pack> | <author>   (defaults to configured values)
 */
const take: Command = {
  name: 'take',
  aliases: ["rebrand", "rename"],
  category: 'converter',
  description: 'Re-sticker a replied sticker/image with custom pack info.',
  usage: 'take <pack> | <author>',
  async run({ sock, msg, text }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'stickerMessage' && target.type !== 'imageMessage') {
      await reply(sock, msg, 'ℹ️ Reply to a sticker or image with *take <pack> | <author>*.');
      return;
    }
    const [pack, author] = text.split('|').map((s) => s.trim());
    await react(sock, msg, '⏳');
    try {
      const media = await downloadMedia(target.raw);
      const webp = await makeSticker(media, {
        pack: pack || env.sticker.pack,
        author: author || env.sticker.author,
      });
      await sock.sendMessage(msg.chat, { sticker: webp }, { quoted: msg.raw });
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not process that.');
    }
  },
};

export default take;
