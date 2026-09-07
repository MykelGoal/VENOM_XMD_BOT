import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import {
  downloadMedia,
  removeImageBackground,
  makeSticker,
} from '../../services/media.service';

/**
 * Remove the background from an image, leaving a transparent PNG.
 *   .nobg            → replies with a transparent PNG (as a document, so
 *                      WhatsApp keeps the alpha channel).
 *   .nobg sticker    → also turns the cut-out into a sticker.
 *
 * Runs a local ONNX segmentation model — no API key, works offline.
 */
const nobg: Command = {
  name: 'nobg',
  aliases: ['removebg', 'rmbg', 'bgremove', 'transparent'],
  category: 'image',
  description: 'Remove the background from an image (transparent PNG).',
  usage: 'nobg [sticker] (reply to an image)',
  async run({ sock, msg, args }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'imageMessage') {
      await reply(sock, msg, 'ℹ️ Reply to an image with *nobg* to remove its background.');
      return;
    }

    const asSticker = ['sticker', 's', 'stick'].includes(
      (args[0] ?? '').toLowerCase(),
    );

    await react(sock, msg, '🎨');
    try {
      const buf = await downloadMedia(target.raw);
      const cut = await removeImageBackground(buf);

      if (asSticker) {
        const sticker = await makeSticker(cut);
        await sock.sendMessage(msg.chat, { sticker }, { quoted: msg.raw });
      } else {
        // Send as a document to preserve the alpha channel — an image message
        // would be flattened onto a white/black background by WhatsApp.
        await sock.sendMessage(
          msg.chat,
          {
            document: cut,
            mimetype: 'image/png',
            fileName: 'nobg.png',
            caption: '✅ Background removed — transparent PNG.',
          },
          { quoted: msg.raw },
        );
      }

      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not remove the background from that image.');
    }
  },
};

export default nobg;
