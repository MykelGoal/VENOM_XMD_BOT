import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "I wondered why the baseball kept getting bigger. Then it hit me.",
  "A bicycle can't stand on its own because it's two-tired.",
  "I'm on a seafood diet. I see food and I eat it.",
  "Time flies like an arrow; fruit flies like a banana.",
  "The math teacher went crazy with the blackboard. He did a number on it.",
  "I lost my job at the bank on my very first day. A woman asked me to check her balance, so I pushed her over."
];

const command: Command = {
  name: 'pun',
  aliases: ["puns"],
  category: 'fun',
  description: "Get a clever pun.",
  usage: 'pun',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "😜 " + pick);
  },
};

export default command;
