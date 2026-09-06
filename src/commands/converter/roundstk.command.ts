import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, makeRoundedSticker } from '../../services/media.service';

const roundstk: Command = {
  name: 'roundstk',
  aliases: ['rounded', 'roundsticker'],
  category: 'converter',
  description: 'Make a rounded-corner sticker from a replied image.',
  usage: 'roundstk (reply to an image)',
  async run({ sock, msg }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'imageMessage') {
      await reply(sock, msg, 'ℹ️ Reply to an image with *roundstk*.');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const media = await downloadMedia(target.raw);
      const webp = await makeRoundedSticker(media);
      await sock.sendMessage(msg.chat, { sticker: webp }, { quoted: msg.raw });
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not process that image.');
    }
  },
};

export default roundstk;
