import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const coinflip: Command = {
  name: 'coinflip',
  aliases: ['flipcoin'],
  category: 'fun',
  description: 'Flip a coin.',
  usage: 'coinflip',
  async run({ sock, msg }) {
    const result = Math.random() < 0.5 ? '🪙 Heads' : '🪙 Tails';
    await reply(sock, msg, result);
  },
};

export default coinflip;
