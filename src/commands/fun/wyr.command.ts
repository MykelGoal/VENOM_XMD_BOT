import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

const FALLBACK = [
  'Would you rather be able to fly or be invisible?',
  'Would you rather never use social media again or never watch another movie?',
  'Would you rather be rich and lonely or poor with great friends?',
];

const wyr: Command = {
  name: 'wyr',
  aliases: ['wouldyourather'],
  category: 'fun',
  description: 'Get a "would you rather" question.',
  usage: 'wyr',
  async run({ sock, msg }) {
    try {
      const d = await fetchJson<any>(
        'https://api.truthordarebot.xyz/v1/wyr',
      );
      await reply(sock, msg, `⚖️ *Would you rather...*\n\n${d.question}`);
    } catch {
      const q = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
      await reply(sock, msg, `⚖️ *Would you rather...*\n\n${q}`);
    }
  },
};

export default wyr;
