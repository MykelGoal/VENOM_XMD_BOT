import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** catfact.ninja — free, no key. */
const catfact: Command = {
  name: 'catfact',
  category: 'tools',
  description: 'Get a random cat fact.',
  usage: 'catfact',
  async run({ sock, msg }) {
    try {
      const d = await fetchJson<any>('https://catfact.ninja/fact');
      await reply(sock, msg, `🐱 ${d.fact}`);
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch a cat fact right now.');
    }
  },
};

export default catfact;
