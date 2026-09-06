import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'flipnum',
  aliases: ["negate"],
  category: 'tools',
  description: "Flip the sign of a number.",
  usage: 'flipnum <number>',
  async run({ sock, msg, text, args }) {
    const n = parseFloat(args[0]);
    if (Number.isNaN(n)) { await reply(sock, msg, 'ℹ️ Usage: *flipnum <number>*'); return; }
    await reply(sock, msg, String(-n));
  },
};

export default command;
