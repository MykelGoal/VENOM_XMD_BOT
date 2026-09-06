import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const random: Command = {
  name: 'random',
  aliases: ['rand', 'rng'],
  category: 'tools',
  description: 'Pick a random number in a range, or a random list item.',
  usage: 'random <min> <max>   OR   random a, b, c',
  async run({ sock, msg, text, args }) {
    if (text.includes(',')) {
      const items = text.split(',').map((s) => s.trim()).filter(Boolean);
      const pick = items[Math.floor(Math.random() * items.length)];
      await reply(sock, msg, `🎯 ${pick}`);
      return;
    }
    const min = parseInt(args[0], 10) || 1;
    const max = parseInt(args[1], 10) || 100;
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const n = Math.floor(Math.random() * (hi - lo + 1)) + lo;
    await reply(sock, msg, `🎲 ${n} (${lo}-${hi})`);
  },
};

export default random;
