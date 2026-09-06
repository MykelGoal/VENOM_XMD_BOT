import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** randomfox.ca — free, no key. */
const fox: Command = {
  name: 'fox',
  category: 'fun',
  description: 'Get a random fox picture.',
  usage: 'fox',
  async run({ sock, msg }) {
    await react(sock, msg, '🦊');
    try {
      const d = await fetchJson<any>('https://randomfox.ca/floof/');
      await sock.sendMessage(
        msg.chat,
        { image: { url: d.image }, caption: '🦊' },
        { quoted: msg.raw },
      );
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch a fox right now.');
    }
  },
};

export default fox;
