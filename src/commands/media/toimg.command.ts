import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia } from '../../services/media.service';

const toimg: Command = {
  name: 'toimg',
  aliases: ['toimage'],
  category: 'media',
  description: 'Convert a replied sticker back into an image.',
  usage: 'toimg (reply to a sticker)',
  async run({ sock, msg }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'stickerMessage') {
      await reply(sock, msg, 'ℹ️ Reply to a *sticker* with *toimg*.');
      return;
    }

    await react(sock, msg, '⏳');
    try {
      const media = await downloadMedia(target.raw);
      await sock.sendMessage(
        msg.chat,
        { image: media, caption: '🖼️ Here you go.' },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not convert that sticker (animated stickers stay webp).');
    }
  },
};

export default toimg;
