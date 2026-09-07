import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import {
  downloadMedia,
  removeImageBackground,
  makeSticker,
} from '../../services/media.service';

/**
 * Remove the background from an image, leaving a transparent PNG.
 *   .nobg            → transparent PNG (as a document, to keep the alpha)
 *   .nobg sticker    → cut-out delivered as a sticker
 *
 * Backend: remove.bg API (if REMOVEBG_API_KEY set — works on any host) with a
 * local ONNX model fallback. Always gives the user feedback, never hangs.
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
    // Tell the user we started — so it never feels like it froze.
    await reply(sock, msg, '🎨 Removing the background… give me a few seconds.');

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
    } catch (err) {
      await react(sock, msg, '❌');
      const isBackend = (err as Error)?.message === 'NO_BACKEND';
      await reply(
        sock,
        msg,
        isBackend
          ? '❌ Background removal is unavailable on this server.\n\n' +
              'This feature needs a lot of memory and free hosts run out of it.\n' +
              '👉 *Owner fix:* set a free `REMOVEBG_API_KEY` (get one at remove.bg) — ' +
              'it works on any host. Then try again.'
          : '❌ Could not remove the background from that image. Please try again.',
      );
    }
  },
};

export default nobg;
