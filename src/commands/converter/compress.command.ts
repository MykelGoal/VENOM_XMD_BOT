import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, compressImage } from '../../services/media.service';
import { formatBytes } from '../../utils/helpers';

const compress: Command = {
  name: 'compress',
  aliases: ['shrink'],
  category: 'converter',
  description: 'Compress a replied image to a smaller size.',
  usage: 'compress (reply to an image)',
  async run({ sock, msg }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'imageMessage') {
      await reply(sock, msg, 'ℹ️ Reply to an image with *compress*.');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const media = await downloadMedia(target.raw);
      const out = await compressImage(media);
      const caption = `🗜️ ${formatBytes(media.length)} → ${formatBytes(out.length)}`;
      await sock.sendMessage(
        msg.chat,
        { image: out, caption },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not compress that image.');
    }
  },
};

export default compress;
