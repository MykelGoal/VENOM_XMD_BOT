import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { resolveYt, ytMp3, formatViews } from '../../services/download.service';

const play: Command = {
  name: 'play',
  aliases: ['song', 'ytmp3', 'yta'],
  category: 'downloader',
  description: 'Search YouTube and send the audio (MP3) of the top result.',
  usage: 'play <song name or YouTube url>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *play <song name>*\n\nExample: _play alan walker faded_');
      return;
    }
    await react(sock, msg, '🔎');
    try {
      const v = await resolveYt(text);
      await reply(
        sock,
        msg,
        `🎵 *${v.title}*\n👤 ${v.author}\n⏱️ ${v.duration}  •  👁️ ${formatViews(v.views)}\n\n_Downloading audio…_`,
      );
      await react(sock, msg, '⏳');
      const dl = await ytMp3(v.url);
      await sock.sendMessage(
        msg.chat,
        {
          audio: { url: dl.url },
          mimetype: 'audio/mpeg',
          fileName: `${v.title}.mp3`.replace(/[\\/:*?"<>|]/g, ''),
        },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not fetch that song. Try a different title.');
    }
  },
};

export default play;
