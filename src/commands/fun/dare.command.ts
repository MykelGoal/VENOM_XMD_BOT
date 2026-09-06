import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

const FALLBACK = [
  'Send the last photo in your gallery.',
  'Do 10 push-ups right now.',
  'Text your crush "hi".',
  'Speak in an accent for the next 3 messages.',
];

const dare: Command = {
  name: 'dare',
  category: 'fun',
  description: 'Get a random dare.',
  usage: 'dare',
  async run({ sock, msg }) {
    try {
      const d = await fetchJson<any>('https://api.truthordarebot.xyz/v1/dare');
      await reply(sock, msg, `😈 *Dare:* ${d.question}`);
    } catch {
      const q = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
      await reply(sock, msg, `😈 *Dare:* ${q}`);
    }
  },
};

export default dare;
