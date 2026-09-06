import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'repeatext',
  aliases: ["repeattext","loop"],
  category: 'tools',
  description: "Repeat text N times.",
  usage: 'repeatext <n> <text>',
  async run({ sock, msg, text, args }) {
    const n = Math.min(Math.max(parseInt(args[0], 10) || 0, 1), 50);
    const rest = args.slice(1).join(' ');
    if (!rest) { await reply(sock, msg, 'ℹ️ Usage: *repeatext <n> <text>*'); return; }
    await reply(sock, msg, Array(n).fill(rest).join(' '));
  },
};

export default command;
