import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "I'm reading a book about anti-gravity. It's impossible to put down.",
  "Why did the scarecrow win an award? He was outstanding in his field.",
  "I only know 25 letters of the alphabet. I don't know y.",
  "What do you call fake spaghetti? An impasta.",
  "I used to hate facial hair, but then it grew on me.",
  "Why don't skeletons fight each other? They don't have the guts.",
  "I would tell you a construction joke, but I'm still working on it."
];

const command: Command = {
  name: 'dadjoke',
  aliases: ["dad"],
  category: 'fun',
  description: "Get a groan-worthy dad joke.",
  usage: 'dadjoke',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "👨 " + pick);
  },
};

export default command;
