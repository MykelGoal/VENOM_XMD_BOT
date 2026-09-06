import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'count',
  aliases: ["charcount"],
  category: 'tools',
  description: "Count characters in the text.",
  usage: 'count <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *count <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => `🔢 ${text.length} characters`)(text2);
    await reply(sock, msg, out);
  },
};

export default command;
