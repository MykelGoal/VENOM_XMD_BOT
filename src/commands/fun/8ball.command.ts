import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const ANSWERS = [
  'It is certain.', 'Without a doubt.', 'Yes, definitely.', 'Most likely.',
  'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.',
  'Cannot predict now.', "Don't count on it.", 'My reply is no.',
  'Very doubtful.', 'Outlook not so good.',
];

const eightball: Command = {
  name: '8ball',
  aliases: ['magicball'],
  category: 'fun',
  description: 'Ask the magic 8-ball a yes/no question.',
  usage: '8ball <question>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *8ball <question>*');
      return;
    }
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    await reply(sock, msg, `🎱 ${answer}`);
  },
};

export default eightball;
