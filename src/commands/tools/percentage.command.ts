import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'percentage',
  aliases: ["percent","pct"],
  category: 'tools',
  description: "Calculate X% of Y.",
  usage: 'percentage <x> <y>',
  async run({ sock, msg, text, args }) {
    const x = parseFloat(args[0]); const y = parseFloat(args[1]);
    if (Number.isNaN(x) || Number.isNaN(y)) { await reply(sock, msg, 'ℹ️ Usage: *percentage <x> <y>*  (x% of y)'); return; }
    await reply(sock, msg, `📊 ${x}% of ${y} = *${(x/100*y)}*`);
  },
};

export default command;
