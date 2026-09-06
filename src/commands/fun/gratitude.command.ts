import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "Name three things that went right today.",
  "Someone helped you recently — remember them.",
  "You woke up today. That's a gift.",
  "Think of a place that makes you feel at peace.",
  "Recall a small win from this week.",
  "Somebody is grateful you exist."
];

const command: Command = {
  name: 'gratitude',
  aliases: ["grateful"],
  category: 'fun',
  description: "A prompt to feel grateful.",
  usage: 'gratitude',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "🙏 " + pick);
  },
};

export default command;
