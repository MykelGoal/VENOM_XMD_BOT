import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'tip',
  aliases: ["tipcalc"],
  category: 'tools',
  description: "Calculate a tip and total.",
  usage: 'tip <amount> [percent]',
  async run({ sock, msg, text, args }) {
    const amt = parseFloat(args[0]); const pct = parseFloat(args[1]) || 15;
    if (Number.isNaN(amt)) { await reply(sock, msg, 'ℹ️ Usage: *tip <amount> [percent]*'); return; }
    const t = amt * pct / 100;
    await reply(sock, msg, `💵 Tip (${pct}%): *${t.toFixed(2)}*\nTotal: *${(amt + t).toFixed(2)}*`);
  },
};

export default command;
