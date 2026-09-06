import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { tiktok } from '../../services/download.service';

const tiktokCmd: Command = {
  name: 'tiktok',
  aliases: ['tt', 'tiktokdl', 'ttdl'],
  category: 'downloader',
  description: 'Download a TikTok video without watermark.',
  usage: 'tiktok <tiktok url>',
  async run({ sock, msg, text }) {
    const url = text.trim();
    if (!/tiktok\.com|vm\.tiktok|vt\.tiktok/i.test(url)) {
      await reply(sock, msg, 'ℹ️ Usage: *tiktok <tiktok url>*');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const t = await tiktok(url);
      await sock.sendMessage(
        msg.chat,
        {
          video: { url: t.video },
          caption: `🎵 *TikTok*\n👤 @${t.author}\n📝 ${t.title}`,
        },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not download that TikTok. Check the link.');
    }
  },
};

export default tiktokCmd;
