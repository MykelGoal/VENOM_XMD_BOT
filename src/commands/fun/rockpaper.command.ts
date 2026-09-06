import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'rockpaper',
  aliases: ["rpschoice"],
  category: 'fun',
  description: "The bot throws rock, paper, or scissors.",
  usage: 'rockpaper',
  async run({ sock, msg, text, args }) {
    const opts = ['🪨 Rock', '📄 Paper', '✂️ Scissors'];
    await reply(sock, msg, opts[Math.floor(Math.random() * opts.length)]);
  },
};

export default command;
