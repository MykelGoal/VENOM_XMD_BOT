import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** cataas / thecatapi — free, no key. */
const cat: Command = {
  name: 'cat',
  aliases: ['kitty'],
  category: 'fun',
  description: 'Get a random cat picture.',
  usage: 'cat',
  async run({ sock, msg }) {
    await react(sock, msg, '🐱');
    try {
      const d = await fetchJson<any>(
        'https://api.thecatapi.com/v1/images/search',
      );
      await sock.sendMessage(
        msg.chat,
        { image: { url: d[0].url }, caption: '🐱 Meow!' },
        { quoted: msg.raw },
      );
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch a cat right now.');
    }
  },
};

export default cat;
