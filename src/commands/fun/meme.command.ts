import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** meme-api.com (reddit memes) — free, no key. */
const meme: Command = {
  name: 'meme',
  category: 'fun',
  description: 'Get a random meme.',
  usage: 'meme',
  async run({ sock, msg }) {
    await react(sock, msg, '⏳');
    try {
      const d = await fetchJson<any>('https://meme-api.com/gimme');
      await sock.sendMessage(
        msg.chat,
        { image: { url: d.url }, caption: `😹 ${d.title}` },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '⚠️ Could not fetch a meme right now.');
    }
  },
};

export default meme;
