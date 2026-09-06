import sharp from 'sharp';
import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia } from '../../services/media.service';

function bytes(n?: number): string {
  if (!n) return 'N/A';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + ' MB';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' KB';
  return n + ' B';
}

const exif: Command = {
  name: 'exif',
  aliases: ['imgmeta', 'metadata'],
  category: 'image',
  description: 'Read metadata (format, size, dimensions, colour) of a replied image.',
  usage: 'exif (reply to an image)',
  async run({ sock, msg }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'imageMessage' && target.type !== 'stickerMessage') {
      await reply(sock, msg, 'ℹ️ Reply to an image (or sticker) with *exif*.');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const buf = await downloadMedia(target.raw);
      const m = await sharp(buf).metadata();
      const info = [
        '🔍 *Image Metadata*',
        '',
        `📐 Dimensions: ${m.width ?? '?'} × ${m.height ?? '?'} px`,
        `🖼️ Format: ${(m.format || 'unknown').toUpperCase()}`,
        `🎨 Colour space: ${m.space || 'N/A'}`,
        `🧬 Channels: ${m.channels ?? 'N/A'}`,
        `🔳 Alpha: ${m.hasAlpha ? 'yes' : 'no'}`,
        `📊 Density: ${m.density ? m.density + ' dpi' : 'N/A'}`,
        `💾 File size: ${bytes(buf.length)}`,
        m.orientation ? `🧭 Orientation: ${m.orientation}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      await reply(sock, msg, info);
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '⚠️ Could not read that image metadata.');
    }
  },
};

export default exif;
