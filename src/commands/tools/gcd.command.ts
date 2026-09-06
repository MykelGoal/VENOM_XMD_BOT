import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'gcd',
  aliases: ["hcf"],
  category: 'tools',
  description: "Greatest common divisor of two numbers.",
  usage: 'gcd <a> <b>',
  async run({ sock, msg, text, args }) {
    let a = Math.abs(parseInt(args[0], 10)), b = Math.abs(parseInt(args[1], 10));
    if (Number.isNaN(a) || Number.isNaN(b)) { await reply(sock, msg, 'ℹ️ Usage: *gcd <a> <b>*'); return; }
    while (b) { [a, b] = [b, a % b]; }
    await reply(sock, msg, `GCD = *${a}*`);
  },
};

export default command;
