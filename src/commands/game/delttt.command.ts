import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { games } from '../_shared/gamestate';

const delttt: Command = {
  name: 'delttt',
  aliases: ['stopttt', 'endttt'],
  category: 'game',
  description: 'End the current tic-tac-toe game.',
  usage: 'delttt',
  async run({ sock, msg }) {
    if (!games.getTtt(msg.chat)) {
      await reply(sock, msg, 'ℹ️ No tic-tac-toe game running here.');
      return;
    }
    games.endTtt(msg.chat);
    await reply(sock, msg, '🛑 Tic-tac-toe game ended.');
  },
};

export default delttt;
