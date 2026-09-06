import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'lcm',
  aliases: [],
  category: 'tools',
  description: "Least common multiple of two numbers.",
  usage: 'lcm <a> <b>',
  async run({ sock, msg, text, args }) {
    const a = Math.abs(parseInt(args[0], 10)), b = Math.abs(parseInt(args[1], 10));
    if (Number.isNaN(a) || Number.isNaN(b) || a === 0 || b === 0) { await reply(sock, msg, 'ℹ️ Usage: *lcm <a> <b>*'); return; }
    let x = a, y = b; while (y) { [x, y] = [y, x % y]; }
    await reply(sock, msg, `LCM = *${(a / x) * b}*`);
  },
};

export default command;
