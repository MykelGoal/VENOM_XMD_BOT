import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

const quote: Command = {
  name: 'quote',
  aliases: ['inspire'],
  category: 'fun',
  description: 'Get a random inspirational quote.',
  usage: 'quote',
  async run({ sock, msg }) {
    try {
      const data = await fetchJson<{ content: string; author: string }>(
        'https://api.quotable.io/random',
      );
      await reply(sock, msg, `💬 "${data.content}"\n\n— *${data.author}*`);
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch a quote right now.');
    }
  },
};

export default quote;
