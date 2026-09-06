import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'decbin',
  aliases: ["tobin","d2b"],
  category: 'tools',
  description: "Convert a decimal number to binary.",
  usage: 'decbin <number>',
  async run({ sock, msg, text, args }) {
    const n = parseInt(args[0], 10);
    if (Number.isNaN(n)) { await reply(sock, msg, 'ℹ️ Usage: *decbin <number>*'); return; }
    await reply(sock, msg, (n >>> 0).toString(2));
  },
};

export default command;
