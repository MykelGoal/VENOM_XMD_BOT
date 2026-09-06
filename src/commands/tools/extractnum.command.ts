import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'extractnum',
  aliases: ["getnumbers","numbers"],
  category: 'tools',
  description: "Extract all numbers from text.",
  usage: 'extractnum <text>',
  async run({ sock, msg, text, args }) {
    const input = text || msg.quoted?.body || '';
    const nums = input.match(/-?\d+(?:\.\d+)?/g);
    await reply(sock, msg, nums ? '🔢 ' + nums.join(', ') : 'No numbers found.');
  },
};

export default command;
