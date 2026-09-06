import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** uselessfacts — free, no key. */
const fact: Command = {
  name: 'fact',
  aliases: ['randomfact'],
  category: 'fun',
  description: 'Get a random interesting fact.',
  usage: 'fact',
  async run({ sock, msg }) {
    try {
      const d = await fetchJson<any>(
        'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en',
      );
      await reply(sock, msg, `🧠 ${d.text}`);
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch a fact right now.');
    }
  },
};

export default fact;
