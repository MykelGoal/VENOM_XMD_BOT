import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'smart',
  aliases: ["smartmeter"],
  category: 'fun',
  description: "How smart are you? (for fun).",
  usage: 'smart <name>',
  async run({ sock, msg, text, args }) {
    const name = text.trim() || msg.senderNumber || 'You';
    const pct = Math.floor(Math.random() * 101);
    await reply(sock, msg, `🎓 *${name}* is *${pct}%* smart`);
  },
};

export default command;
