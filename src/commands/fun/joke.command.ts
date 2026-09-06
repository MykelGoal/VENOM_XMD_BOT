import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

const joke: Command = {
  name: 'joke',
  category: 'fun',
  description: 'Get a random joke.',
  usage: 'joke',
  async run({ sock, msg }) {
    try {
      const data = await fetchJson<{
        type: string;
        joke?: string;
        setup?: string;
        delivery?: string;
      }>('https://v2.jokeapi.dev/joke/Any?safe-mode');

      const text =
        data.type === 'single'
          ? data.joke ?? '😅'
          : `${data.setup}\n\n...${data.delivery}`;
      await reply(sock, msg, `😂 ${text}`);
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch a joke right now.');
    }
  },
};

export default joke;
