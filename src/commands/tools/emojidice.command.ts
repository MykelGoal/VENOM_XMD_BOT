import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'emojidice',
  aliases: ["emojiroll"],
  category: 'tools',
  description: "Roll a single emoji die.",
  usage: 'emojidice',
  async run({ sock, msg, text, args }) {
    const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    await reply(sock, msg, faces[Math.floor(Math.random() * 6)]);
  },
};

export default command;
