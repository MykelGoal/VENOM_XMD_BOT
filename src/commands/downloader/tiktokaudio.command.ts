import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { tiktok } from '../../services/download.service';

const tiktokaudio: Command = {
  name: 'tiktokaudio',
  aliases: ['ttmp3', 'ttaudio', 'ttmusic'],
  category: 'downloader',
  description: 'Extract the audio/music from a TikTok video.',
  usage: 'tiktokaudio <tiktok url>',
  async run({ sock, msg, text }) {
    const url = text.trim();
    if (!/tiktok\.com|vm\.tiktok|vt\.tiktok/i.test(url)) {
      await reply(sock, msg, 'ℹ️ Usage: *tiktokaudio <tiktok url>*');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const t = await tiktok(url);
      if (!t.music) {
        await reply(sock, msg, '❌ No audio track found for that TikTok.');
        await react(sock, msg, '❌');
        return;
      }
      await sock.sendMessage(
        msg.chat,
        { audio: { url: t.music }, mimetype: 'audio/mpeg', fileName: 'tiktok-audio.mp3' },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not extract that TikTok audio.');
    }
  },
};

export default tiktokaudio;
