import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "A pleasant surprise is waiting for you.",
  "Your hard work is about to pay off.",
  "Good news will come to you by mail... or DM.",
  "A new opportunity is on the horizon.",
  "Someone is thinking about you right now.",
  "Adventure awaits — say yes to it.",
  "Patience will be rewarded soon."
];

const command: Command = {
  name: 'fortune',
  aliases: ["cookie","fortunecookie"],
  category: 'fun',
  description: "Open a fortune cookie.",
  usage: 'fortune',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "🥠 " + pick);
  },
};

export default command;
