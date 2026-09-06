import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'hexdec',
  aliases: ["fromhex","h2d"],
  category: 'tools',
  description: "Convert a hex number to decimal.",
  usage: 'hexdec <hex>',
  async run({ sock, msg, text, args }) {
    const h = (args[0] || '').replace(/^0x/i, '');
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) { await reply(sock, msg, 'ℹ️ Usage: *hexdec <hex>*'); return; }
    await reply(sock, msg, String(n));
  },
};

export default command;
