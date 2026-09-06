import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'countdown',
  aliases: ["daysuntil"],
  category: 'tools',
  description: "Days until a given date (YYYY-MM-DD).",
  usage: 'countdown <YYYY-MM-DD>',
  async run({ sock, msg, text, args }) {
    const d = new Date(args[0]);
    if (!args[0] || Number.isNaN(d.getTime())) { await reply(sock, msg, 'ℹ️ Usage: *countdown 2026-12-25*'); return; }
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
    if (days > 0) await reply(sock, msg, `⏳ *${days}* day(s) until ${args[0]}.`);
    else if (days === 0) await reply(sock, msg, '🎉 That day is today!');
    else await reply(sock, msg, `📅 That date was *${-days}* day(s) ago.`);
  },
};

export default command;
