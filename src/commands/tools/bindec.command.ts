import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'bindec',
  aliases: ["frombin","b2d"],
  category: 'tools',
  description: "Convert a binary number to decimal.",
  usage: 'bindec <bits>',
  async run({ sock, msg, text, args }) {
    const b = (args[0] || '').replace(/[^01]/g, '');
    if (!b) { await reply(sock, msg, 'ℹ️ Usage: *bindec <bits>*'); return; }
    await reply(sock, msg, String(parseInt(b, 2)));
  },
};

export default command;
