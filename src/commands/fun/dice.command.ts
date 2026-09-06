import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const dice: Command = {
  name: 'dice',
  aliases: ['roll'],
  category: 'fun',
  description: 'Roll a dice (1-6) or 1-N with "dice N".',
  usage: 'dice [max]',
  async run({ sock, msg, args }) {
    const max = Math.max(2, Math.min(1000, parseInt(args[0], 10) || 6));
    const roll = Math.floor(Math.random() * max) + 1;
    await reply(sock, msg, `🎲 You rolled *${roll}* (1-${max})`);
  },
};

export default dice;
