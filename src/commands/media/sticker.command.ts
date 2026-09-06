import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, makeSticker } from '../../services/media.service';

const sticker: Command = {
  name: 'sticker',
  aliases: ['s', 'stiker'],
  category: 'media',
  description: 'Convert a replied/attached image or short video to a sticker.',
  usage: 'sticker (reply to an image/video)',
  async run({ sock, msg }) {
    const target = msg.quoted ?? msg;
    const isImage = target.type === 'imageMessage';
    const isVideo = target.type === 'videoMessage';

    if (!isImage && !isVideo) {
      await reply(
        sock,
        msg,
        'ℹ️ Reply to an image or short video with *sticker*.',
      );
      return;
    }

    await react(sock, msg, '⏳');
    try {
      const media = await downloadMedia(target.raw);
      const webp = await makeSticker(media);
      await sock.sendMessage(
        msg.chat,
        { sticker: webp },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      await reply(
        sock,
        msg,
        '❌ Failed to make sticker. For videos, keep them under ~10s.',
      );
    }
  },
};

export default sticker;
