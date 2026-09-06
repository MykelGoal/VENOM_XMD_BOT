import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** dog.ceo — free, no key. */
const dog: Command = {
  name: 'dog',
  aliases: ['puppy'],
  category: 'fun',
  description: 'Get a random dog picture.',
  usage: 'dog',
  async run({ sock, msg }) {
    await react(sock, msg, '🐶');
    try {
      const d = await fetchJson<any>(
        'https://dog.ceo/api/breeds/image/random',
      );
      await sock.sendMessage(
        msg.chat,
        { image: { url: d.message }, caption: '🐶 Woof!' },
        { quoted: msg.raw },
      );
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch a dog right now.');
    }
  },
};

export default dog;
