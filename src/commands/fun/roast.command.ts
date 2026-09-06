import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "You're not stupid; you just have bad luck thinking.",
  "I'd agree with you but then we'd both be wrong.",
  "You bring everyone so much joy... when you leave the room.",
  "You're the reason the shampoo has instructions.",
  "Somewhere out there a tree is working hard to replace the oxygen you waste.",
  "You have something on your chin... no, the third one down."
];

const command: Command = {
  name: 'roast',
  aliases: ["burn"],
  category: 'fun',
  description: "Get a light-hearted roast.",
  usage: 'roast',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "🔥 " + pick);
  },
};

export default command;
