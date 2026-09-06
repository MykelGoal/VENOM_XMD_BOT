import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchBuffer, makeSticker } from '../../services/media.service';

/** Mixes two emojis into one sticker via emojik (Google Emoji Kitchen). */
const emojimix: Command = {
  name: 'emojimix',
  aliases: ['emix', 'mixemoji'],
  category: 'converter',
  description: 'Mix two emojis into one sticker.',
  usage: 'emojimix 😀 😎',
  async run({ sock, msg, args }) {
    // Split on whitespace or a "+"
    const parts = (args.join(' ').match(/\p{Emoji}/gu) ?? []).slice(0, 2);
    if (parts.length < 2) {
      await reply(sock, msg, 'ℹ️ Usage: *emojimix 😀 😎* (two emojis)');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const url = `https://emojik.vercel.app/s/${encodeURIComponent(parts[0])}_${encodeURIComponent(parts[1])}?size=512`;
      const png = await fetchBuffer(url);
      const webp = await makeSticker(png);
      await sock.sendMessage(msg.chat, { sticker: webp }, { quoted: msg.raw });
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ That emoji combo is not supported. Try different ones.');
    }
  },
};

export default emojimix;
