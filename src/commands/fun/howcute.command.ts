import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'howcute',
  aliases: ["cute"],
  category: 'fun',
  description: "A fun cuteness percentage.",
  usage: 'howcute <name>',
  async run({ sock, msg, text, args }) {
    const name = text.trim() || msg.senderNumber || 'You';
    const pct = Math.floor(Math.random() * 101);
    await reply(sock, msg, `🥰 *${name}* is *${pct}%* cute`);
  },
};

export default command;
