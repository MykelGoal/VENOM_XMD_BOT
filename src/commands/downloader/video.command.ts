import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { resolveYt, ytMp4, formatViews } from '../../services/download.service';

const video: Command = {
  name: 'video',
  aliases: ['ytmp4', 'ytv', 'mp4'],
  category: 'downloader',
  description: 'Search YouTube and send the video (MP4) of the top result.',
  usage: 'video <name or YouTube url>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *video <name>*\n\nExample: _video alan walker faded_');
      return;
    }
    await react(sock, msg, '🔎');
    try {
      const v = await resolveYt(text);
      await reply(
        sock,
        msg,
        `🎬 *${v.title}*\n👤 ${v.author}\n⏱️ ${v.duration}  •  👁️ ${formatViews(v.views)}\n\n_Downloading video…_`,
      );
      await react(sock, msg, '⏳');
      const dl = await ytMp4(v.url);
      await sock.sendMessage(
        msg.chat,
        {
          video: { url: dl.url },
          caption: `🎬 ${v.title}${dl.quality ? `\n📺 ${dl.quality}` : ''}`,
          fileName: `${v.title}.mp4`.replace(/[\\/:*?"<>|]/g, ''),
        },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not fetch that video. Try a different title.');
    }
  },
};

export default video;
