import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'sum',
  aliases: ["total","addup"],
  category: 'tools',
  description: "Sum a list of numbers.",
  usage: 'sum <n1> <n2> ...',
  async run({ sock, msg, text, args }) {
    const nums = (text.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (!nums.length) { await reply(sock, msg, 'ℹ️ Usage: *sum 4 8 15*'); return; }
    await reply(sock, msg, `➕ Total = *${nums.reduce((a, b) => a + b, 0)}*`);
  },
};

export default command;
