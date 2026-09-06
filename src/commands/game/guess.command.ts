import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

/**
 * Simple stateless number-guess: the bot thinks of a number and tells you
 * if your guess was right. For a stateful multi-turn game you'd track
 * sessions per chat; kept simple here.
 */
const guess: Command = {
  name: 'guess',
  category: 'game',
  description: 'Guess the number the bot is thinking of (1-10).',
  usage: 'guess <1-10>',
  async run({ sock, msg, args }) {
    const g = parseInt(args[0], 10);
    if (isNaN(g) || g < 1 || g > 10) {
      await reply(sock, msg, 'ℹ️ Usage: *guess <1-10>*');
      return;
    }
    const n = Math.floor(Math.random() * 10) + 1;
    if (g === n) {
      await reply(sock, msg, `🎉 Correct! It was *${n}*.`);
    } else {
      await reply(sock, msg, `❌ Nope, it was *${n}*. Try again!`);
    }
  },
};

export default guess;
