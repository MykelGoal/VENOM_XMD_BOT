import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "Drink a full glass of water right now.",
  "Text someone you appreciate.",
  "Do 10 push-ups.",
  "Tidy one small corner of your space.",
  "Take a 5-minute walk.",
  "Write down one thing you're proud of.",
  "Compliment a stranger today.",
  "Learn one new word and use it."
];

const command: Command = {
  name: 'challenge',
  aliases: ["dailychallenge"],
  category: 'fun',
  description: "Get a small daily challenge.",
  usage: 'challenge',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "🎯 " + pick);
  },
};

export default command;
