import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'factorial',
  aliases: ["fact!"],
  category: 'tools',
  description: "Compute the factorial of a number.",
  usage: 'factorial <n>',
  async run({ sock, msg, text, args }) {
    const n = parseInt(args[0], 10);
    if (Number.isNaN(n) || n < 0 || n > 170) { await reply(sock, msg, 'ℹ️ Usage: *factorial <0-170>*'); return; }
    let r = 1; for (let i = 2; i <= n; i++) r *= i;
    await reply(sock, msg, `${n}! = *${r}*`);
  },
};

export default command;
