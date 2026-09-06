import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "A smooth sea never made a skilled sailor.",
  "Knowledge speaks, but wisdom listens.",
  "Do not wait for the perfect moment; take the moment and make it perfect.",
  "The quieter you become, the more you can hear.",
  "Comparison is the thief of joy."
];

const command: Command = {
  name: 'wisdom',
  aliases: ["sage"],
  category: 'fun',
  description: "Receive a nugget of wisdom.",
  usage: 'wisdom',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "🧙 " + pick);
  },
};

export default command;
