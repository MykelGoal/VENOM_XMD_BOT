import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "I am capable of amazing things.",
  "I choose progress over perfection.",
  "I am worthy of good things.",
  "I grow stronger every single day.",
  "I radiate positivity.",
  "I am in control of my own happiness.",
  "I trust the timing of my life."
];

const command: Command = {
  name: 'affirmation',
  aliases: ["affirm"],
  category: 'fun',
  description: "Get a positive affirmation.",
  usage: 'affirmation',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "🌟 " + pick);
  },
};

export default command;
