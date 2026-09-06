import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "My alarm clock is on strike.",
  "The dog ate my motivation.",
  "Mercury is in retrograde.",
  "I was busy saving the world (quietly).",
  "Traffic. Everywhere. Even inside my house.",
  "My horoscope told me to stay in bed.",
  "I got lost in my own thoughts and couldn't find the exit."
];

const command: Command = {
  name: 'excuse',
  aliases: ["excuses"],
  category: 'fun',
  description: "Generate a random excuse.",
  usage: 'excuse',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "🤷 " + pick);
  },
};

export default command;
