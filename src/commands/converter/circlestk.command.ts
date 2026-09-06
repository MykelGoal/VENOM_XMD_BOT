import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, makeCircleSticker } from '../../services/media.service';

const circlestk: Command = {
  name: 'circlestk',
  aliases: ['circle', 'circlesticker'],
  category: 'converter',
  description: 'Make a circular sticker from a replied image.',
  usage: 'circlestk (reply to an image)',
  async run({ sock, msg }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'imageMessage') {
      await reply(sock, msg, 'ℹ️ Reply to an image with *circlestk*.');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const media = await downloadMedia(target.raw);
      const webp = await makeCircleSticker(media);
      await sock.sendMessage(msg.chat, { sticker: webp }, { quoted: msg.raw });
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not process that image.');
    }
  },
};

export default circlestk;
