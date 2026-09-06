import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { facebook } from '../../services/download.service';

const facebookCmd: Command = {
  name: 'facebook',
  aliases: ['fb', 'fbdl', 'fbvideo'],
  category: 'downloader',
  description: 'Download a Facebook video (HD when available).',
  usage: 'facebook <facebook video url>',
  async run({ sock, msg, text }) {
    const url = text.trim();
    if (!/facebook\.com|fb\.watch|fb\.com/i.test(url)) {
      await reply(sock, msg, 'ℹ️ Usage: *facebook <facebook video url>*');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const f = await facebook(url);
      const media = f.hd || f.sd;
      if (!media) throw new Error('no media');
      await sock.sendMessage(
        msg.chat,
        {
          video: { url: media },
          caption: `📘 *Facebook*\n📝 ${f.title}${f.hd ? '\n📺 HD' : ''}`,
        },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not download that Facebook video.');
    }
  },
};

export default facebookCmd;
