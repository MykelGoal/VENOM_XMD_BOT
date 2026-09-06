import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'wouldyou',
  aliases: ["wr"],
  category: 'fun',
  description: "Would you rather... (single prompt).",
  usage: 'wouldyou',
  async run({ sock, msg, text, args }) {
    const q = ['fly or be invisible?','have unlimited money or unlimited time?','read minds or predict the future?','live in the past or the future?','never use social media again or never watch TV again?','be famous or be powerful?','always be 10 minutes late or 20 minutes early?'];
    await reply(sock, msg, '🤔 Would you rather ' + q[Math.floor(Math.random()*q.length)]);
  },
};

export default command;
