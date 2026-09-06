import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "Not today. Not while I'm still standing.",
  "Everyone gets to go home tonight.",
  "Heroes aren't fearless — we just refuse to quit.",
  "I fight so someone else won't have to.",
  "Hope is a weapon, and I'm fully loaded.",
  "Even the smallest light breaks the dark."
];

const command: Command = {
  name: 'hero',
  aliases: ["heroline"],
  category: 'fun',
  description: "An inspiring hero one-liner.",
  usage: 'hero',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "🦸 " + pick);
  },
};

export default command;
