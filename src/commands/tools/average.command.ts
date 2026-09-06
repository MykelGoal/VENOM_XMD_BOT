import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'average',
  aliases: ["avg","mean"],
  category: 'tools',
  description: "Average of a list of numbers.",
  usage: 'average <n1> <n2> ...',
  async run({ sock, msg, text, args }) {
    const nums = (text.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (!nums.length) { await reply(sock, msg, 'ℹ️ Usage: *average 4 8 15 16*'); return; }
    const sum = nums.reduce((a, b) => a + b, 0);
    await reply(sock, msg, `📊 Average = *${(sum / nums.length).toFixed(2)}* (sum ${sum}, count ${nums.length})`);
  },
};

export default command;
