import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'slug',
  aliases: ["slugify"],
  category: 'tools',
  description: "Turn text into a URL slug.",
  usage: 'slug <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *slug <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => text.toLowerCase().trim().replace(/[^a-z0-9\\s-]/g,'').replace(/\\s+/g,'-').replace(/-+/g,'-'))(text2);
    await reply(sock, msg, out);
  },
};

export default command;
