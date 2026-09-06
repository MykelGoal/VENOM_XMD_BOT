import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "You light up every room you walk into.",
  "You're smarter than you give yourself credit for.",
  "Your smile is contagious.",
  "You have impeccable taste.",
  "You make hard things look easy.",
  "The world is better with you in it.",
  "You're a great listener.",
  "You inspire the people around you.",
  "You have a heart of gold.",
  "Your energy is unmatched."
];

const command: Command = {
  name: 'compliment',
  aliases: ["nice"],
  category: 'fun',
  description: "Get a random compliment.",
  usage: 'compliment',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "💐 " + pick);
  },
};

export default command;
