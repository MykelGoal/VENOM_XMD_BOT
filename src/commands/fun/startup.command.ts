import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "Uber, but for returning library books.",
  "Airbnb for houseplants that need a vacation.",
  "A dating app that only matches you with people who also can't decide where to eat.",
  "Subscription service for one perfectly ripe avocado per day.",
  "Netflix, but it only plays the trailers.",
  "LinkedIn for pets seeking career growth."
];

const command: Command = {
  name: 'startup',
  aliases: ["startupidea"],
  category: 'fun',
  description: "A ridiculous startup idea.",
  usage: 'startup',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "💡 " + pick);
  },
};

export default command;
