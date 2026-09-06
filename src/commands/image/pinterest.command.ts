import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { pinterest } from '../../services/imagesearch.service';

const pinterestCmd: Command = {
  name: 'pinterest',
  aliases: ['pint', 'img', 'image'],
  category: 'image',
  description: 'Search images on Pinterest.',
  usage: 'pinterest <query> [count]',
  async run({ sock, msg, args, text }) {
    if (!text) {
      await reply(
        sock,
        msg,
        'ℹ️ Usage: *pinterest <query> [count]*\n\nExample: _pinterest cyberpunk city 3_',
      );
      return;
    }
    // optional trailing count (1-6)
    let count = 3;
    const query = [...args];
    const last = query[query.length - 1];
    if (last && /^[1-6]$/.test(last)) count = parseInt(query.pop()!, 10);
    const q = query.join(' ');
    await react(sock, msg, '🔎');
    try {
      const hits = await pinterest(q, count);
      for (const h of hits) {
        await sock.sendMessage(
          msg.chat,
          { image: { url: h.image }, caption: `📌 ${q}` },
          { quoted: msg.raw },
        );
      }
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, `❌ No images found for "${q}".`);
    }
  },
};

export default pinterestCmd;
