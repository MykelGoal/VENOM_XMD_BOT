import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'randpin',
  aliases: ["genpin","randompin"],
  category: 'tools',
  description: "Generate a random numeric PIN.",
  usage: 'pin [length]',
  async run({ sock, msg, text, args }) {
    const len = Math.min(Math.max(parseInt(args[0], 10) || 4, 3), 12);
    let out = '';
    for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10);
    await reply(sock, msg, '🔢 ' + out);
  },
};

export default command;
