import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'spread',
  aliases: ["spacetext"],
  category: 'tools',
  description: "Add spaces between every character.",
  usage: 'spread <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *spread <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => text.split('').join(' '))(text2);
    await reply(sock, msg, out);
  },
};

export default command;
