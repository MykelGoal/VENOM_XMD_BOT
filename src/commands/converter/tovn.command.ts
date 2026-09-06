import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, toMp3 } from '../../services/media.service';

const tovn: Command = {
  name: 'tovn',
  aliases: ['tovoice', 'toptt'],
  category: 'converter',
  description: 'Convert a replied audio/video into a voice note (ptt).',
  usage: 'tovn (reply to audio/video)',
  async run({ sock, msg }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'videoMessage' && target.type !== 'audioMessage') {
      await reply(sock, msg, 'ℹ️ Reply to an audio or video with *tovn*.');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const media = await downloadMedia(target.raw);
      const mp3 = await toMp3(media);
      await sock.sendMessage(
        msg.chat,
        { audio: mp3, mimetype: 'audio/mpeg', ptt: true },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not convert that.');
    }
  },
};

export default tovn;
