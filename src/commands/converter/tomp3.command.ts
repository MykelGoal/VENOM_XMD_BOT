import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, toMp3 } from '../../services/media.service';

const tomp3: Command = {
  name: 'tomp3',
  aliases: ['mp3'],
  category: 'converter',
  description: 'Convert a replied video or voice note to an MP3 audio file.',
  usage: 'tomp3 (reply to video/audio)',
  async run({ sock, msg }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'videoMessage' && target.type !== 'audioMessage') {
      await reply(sock, msg, 'ℹ️ Reply to a video or voice note with *tomp3*.');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const media = await downloadMedia(target.raw);
      const mp3 = await toMp3(media);
      await sock.sendMessage(
        msg.chat,
        { audio: mp3, mimetype: 'audio/mpeg' },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not convert that to MP3.');
    }
  },
};

export default tomp3;
