import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';
import { isUrl } from '../../utils/helpers';

/**
 * TikTok downloader using tikwm.com — a free, no-key public API that
 * returns a watermark-free video URL.
 */
const tiktok: Command = {
  name: 'tiktok',
  aliases: ['tt', 'tiktokdl'],
  category: 'media',
  description: 'Download a TikTok video (no watermark).',
  usage: 'tiktok <url>',
  async run({ sock, msg, text }) {
    if (!text || !isUrl(text)) {
      await reply(sock, msg, 'ℹ️ Usage: *tiktok <tiktok url>*');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const res = await fetchJson<any>(
        `https://tikwm.com/api/?url=${encodeURIComponent(text)}`,
      );
      const play = res?.data?.play;
      if (!play) {
        await react(sock, msg, '❌');
        await reply(sock, msg, '❌ Could not resolve that TikTok link.');
        return;
      }
      const videoUrl = play.startsWith('http')
        ? play
        : `https://tikwm.com${play}`;
      await sock.sendMessage(
        msg.chat,
        {
          video: { url: videoUrl },
          caption: `🎵 ${res.data.title ?? 'TikTok'}`,
        },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '⚠️ TikTok download failed. Try again later.');
    }
  },
};

export default tiktok;
