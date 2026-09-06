import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'wordcount',
  aliases: ["wc","wordcounter"],
  category: 'tools',
  description: "Count words and characters.",
  usage: 'wordcount <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *wordcount <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => `📊 Words: *${text.trim().split(/\\s+/).filter(Boolean).length}*\\nCharacters: *${text.length}*\\nCharacters (no spaces): *${text.replace(/\\s/g,'').length}*`)(text2);
    await reply(sock, msg, out);
  },
};

export default command;
