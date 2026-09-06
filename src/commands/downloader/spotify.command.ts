import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { spotify } from '../../services/download.service';

const spotifyCmd: Command = {
  name: 'spotify',
  aliases: ['spot', 'spotifydl'],
  category: 'downloader',
  description: 'Download a track from a Spotify track link.',
  usage: 'spotify <spotify track url>',
  async run({ sock, msg, text }) {
    const url = text.trim();
    if (!/open\.spotify\.com\/track/i.test(url)) {
      await reply(
        sock,
        msg,
        'ℹ️ Usage: *spotify <spotify track url>*\n\nPaste a link like _https://open.spotify.com/track/..._',
      );
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const s = await spotify(url);
      await sock.sendMessage(
        msg.chat,
        {
          audio: { url: s.url },
          mimetype: 'audio/mpeg',
          fileName: `${s.title}.mp3`.replace(/[\\/:*?"<>|]/g, ''),
        },
        { quoted: msg.raw },
      );
      await reply(sock, msg, `🎧 *${s.title}*\n👤 ${s.channel}`);
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not download that Spotify track.');
    }
  },
};

export default spotifyCmd;
