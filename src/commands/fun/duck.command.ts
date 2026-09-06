import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** random-d.uk — free, no key. */
const duck: Command = {
  name: 'duck',
  category: 'fun',
  description: 'Get a random duck picture.',
  usage: 'duck',
  async run({ sock, msg }) {
    await react(sock, msg, '🦆');
    try {
      const d = await fetchJson<any>('https://random-d.uk/api/v2/random');
      await sock.sendMessage(
        msg.chat,
        { image: { url: d.url }, caption: '🦆 Quack!' },
        { quoted: msg.raw },
      );
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch a duck right now.');
    }
  },
};

export default duck;
