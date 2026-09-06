import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'dechex',
  aliases: ["d2h","dec2hex"],
  category: 'tools',
  description: "Convert a decimal number to hex.",
  usage: 'dechex <number>',
  async run({ sock, msg, text, args }) {
    const n = parseInt(args[0], 10);
    if (Number.isNaN(n)) { await reply(sock, msg, 'ℹ️ Usage: *dechex <number>*'); return; }
    await reply(sock, msg, '0x' + n.toString(16).toUpperCase());
  },
};

export default command;
