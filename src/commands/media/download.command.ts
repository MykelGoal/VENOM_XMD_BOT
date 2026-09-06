import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchBuffer } from '../../services/media.service';
import { isUrl } from '../../utils/helpers';

/**
 * Generic direct-media downloader: fetches a direct image/video URL and
 * sends it back. For platform links (YouTube/TikTok/IG) plug an API into
 * a dedicated command — those need a resolver service, not a direct GET.
 */
const download: Command = {
  name: 'download',
  aliases: ['dl', 'geturl'],
  category: 'media',
  description: 'Download a direct image/video URL and send it back.',
  usage: 'download <direct-media-url>',
  async run({ sock, msg, text }) {
    if (!text || !isUrl(text)) {
      await reply(sock, msg, 'ℹ️ Usage: *download <valid direct media url>*');
      return;
    }

    await react(sock, msg, '⏳');
    try {
      const buffer = await fetchBuffer(text);
      const isVideo = /\.(mp4|mov|webm|mkv)(\?|$)/i.test(text);
      if (isVideo) {
        await sock.sendMessage(
          msg.chat,
          { video: buffer },
          { quoted: msg.raw },
        );
      } else {
        await sock.sendMessage(
          msg.chat,
          { image: buffer },
          { quoted: msg.raw },
        );
      }
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(
        sock,
        msg,
        '❌ Could not fetch that URL. Make sure it is a direct media link.',
      );
    }
  },
};

export default download;
