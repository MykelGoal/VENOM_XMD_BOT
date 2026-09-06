import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "You're too late... you've always been too late.",
  "Every hero I meet just makes a better trophy.",
  "I don't lose. I simply run out of witnesses.",
  "Kneel, and I might spare your Wi-Fi.",
  "Your courage is adorable. Fatal, but adorable.",
  "The world burns brightest right before the end."
];

const command: Command = {
  name: 'villain',
  aliases: ["villainline"],
  category: 'fun',
  description: "A dramatic villain one-liner.",
  usage: 'villain',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "😈 " + pick);
  },
};

export default command;
