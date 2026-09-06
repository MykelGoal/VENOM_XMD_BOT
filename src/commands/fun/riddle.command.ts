import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "What has keys but can't open locks? (A piano)",
  "What gets wetter the more it dries? (A towel)",
  "What has a neck but no head? (A bottle)",
  "What can travel around the world while staying in a corner? (A stamp)",
  "The more you take, the more you leave behind. What am I? (Footsteps)",
  "What has hands but cannot clap? (A clock)",
  "What has to be broken before you can use it? (An egg)",
  "What goes up but never comes down? (Your age)"
];

const command: Command = {
  name: 'riddle',
  aliases: ["brainteaser"],
  category: 'fun',
  description: "Get a riddle to solve.",
  usage: 'riddle',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "🧩 " + pick);
  },
};

export default command;
