import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'snake',
  aliases: ["snakecase"],
  category: 'tools',
  description: "Convert text to snake_case.",
  usage: 'snake <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *snake <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => text.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''))(text2);
    await reply(sock, msg, out);
  },
};

export default command;
