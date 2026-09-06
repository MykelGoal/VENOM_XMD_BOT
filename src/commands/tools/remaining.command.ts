import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'remaining',
  aliases: ["dayleft","yearprogress"],
  category: 'tools',
  description: "How much of the year is left.",
  usage: 'remaining',
  async run({ sock, msg, text, args }) {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1).getTime();
    const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
    const pct = ((now.getTime() - start) / (end - start)) * 100;
    const bar = '█'.repeat(Math.round(pct/10)) + '░'.repeat(10 - Math.round(pct/10));
    await reply(sock, msg, `📅 ${now.getFullYear()} is *${pct.toFixed(1)}%* complete.\n[${bar}]`);
  },
};

export default command;
