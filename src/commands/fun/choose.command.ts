import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const choose: Command = {
  name: 'choose',
  aliases: ['pick'],
  category: 'fun',
  description: 'Let the bot choose between options (separate with "or" or ",").',
  usage: 'choose pizza or pasta',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *choose a or b or c*');
      return;
    }
    const options = text
      .split(/\s+or\s+|,/i)
      .map((o) => o.trim())
      .filter(Boolean);
    if (options.length < 2) {
      await reply(sock, msg, 'ℹ️ Give me at least two options.');
      return;
    }
    const pick = options[Math.floor(Math.random() * options.length)];
    await reply(sock, msg, `🤔 I choose: *${pick}*`);
  },
};

export default choose;
