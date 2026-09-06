import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

const FALLBACK = [
  'What is your biggest fear?',
  'What is a secret you have never told anyone?',
  'Who was your first crush?',
  'What is the most embarrassing thing you have done?',
];

const truth: Command = {
  name: 'truth',
  category: 'fun',
  description: 'Get a random truth question.',
  usage: 'truth',
  async run({ sock, msg }) {
    try {
      const d = await fetchJson<any>(
        'https://api.truthordarebot.xyz/v1/truth',
      );
      await reply(sock, msg, `🤔 *Truth:* ${d.question}`);
    } catch {
      const q = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
      await reply(sock, msg, `🤔 *Truth:* ${q}`);
    }
  },
};

export default truth;
