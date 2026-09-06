import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'fib',
  aliases: ["fibonacci"],
  category: 'tools',
  description: "Show the first N Fibonacci numbers.",
  usage: 'fib <n>',
  async run({ sock, msg, text, args }) {
    const n = Math.min(Math.max(parseInt(args[0], 10) || 10, 1), 50);
    const seq = [0, 1];
    for (let i = 2; i < n; i++) seq.push(seq[i-1] + seq[i-2]);
    await reply(sock, msg, '🔢 ' + seq.slice(0, n).join(', '));
  },
};

export default command;
