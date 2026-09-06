import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'lower',
  aliases: ["lowercase","lc"],
  category: 'tools',
  description: "Convert text to lowercase.",
  usage: 'lower <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *lower <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => text.toLowerCase())(text2);
    await reply(sock, msg, out);
  },
};

export default command;
