import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'countdownto',
  aliases: ["newyear"],
  category: 'tools',
  description: "Days left until next New Year.",
  usage: 'countdownto',
  async run({ sock, msg, text, args }) {
    const now = new Date();
    const ny = new Date(now.getFullYear() + 1, 0, 1);
    const days = Math.ceil((ny.getTime() - now.getTime()) / 86400000);
    await reply(sock, msg, `🎆 *${days}* day(s) until New Year ${now.getFullYear() + 1}!`);
  },
};

export default command;
