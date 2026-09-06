import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'upper',
  aliases: ["uppercase","uc"],
  category: 'tools',
  description: "Convert text to UPPERCASE.",
  usage: 'upper <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *upper <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => text.toUpperCase())(text2);
    await reply(sock, msg, out);
  },
};

export default command;
