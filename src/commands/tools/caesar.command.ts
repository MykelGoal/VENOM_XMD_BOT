import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'caesar',
  aliases: ["caesarcipher"],
  category: 'tools',
  description: "Caesar-cipher text by a shift.",
  usage: 'caesar <shift> <text>',
  async run({ sock, msg, text, args }) {
    const shift = parseInt(args[0], 10);
    const input = args.slice(1).join(' ');
    if (Number.isNaN(shift) || !input) { await reply(sock, msg, 'ℹ️ Usage: *caesar <shift> <text>*'); return; }
    const out = input.replace(/[a-z]/gi, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + (shift % 26 + 26)) % 26 + b); });
    await reply(sock, msg, out);
  },
};

export default command;
