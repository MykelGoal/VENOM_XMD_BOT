import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'roman',
  aliases: ["toroman"],
  category: 'tools',
  description: "Convert a number to Roman numerals.",
  usage: 'roman <number>',
  async run({ sock, msg, text, args }) {
    const n = parseInt(args[0], 10);
    if (Number.isNaN(n) || n <= 0 || n >= 4000) { await reply(sock, msg, 'ℹ️ Usage: *roman <1-3999>*'); return; }
    const map: [number,string][] = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    let num = n, out = '';
    for (const [v, s] of map) { while (num >= v) { out += s; num -= v; } }
    await reply(sock, msg, '🏛️ ' + out);
  },
};

export default command;
