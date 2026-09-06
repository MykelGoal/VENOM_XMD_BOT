import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'age',
  aliases: ["calcage"],
  category: 'tools',
  description: "Calculate age from a birth year.",
  usage: 'age <year>',
  async run({ sock, msg, text, args }) {
    const y = parseInt(args[0], 10);
    const now = new Date().getFullYear();
    if (Number.isNaN(y) || y < 1900 || y > now) { await reply(sock, msg, 'ℹ️ Usage: *age <birth year>*'); return; }
    await reply(sock, msg, `🎂 You are about *${now - y}* years old.`);
  },
};

export default command;
