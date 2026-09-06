import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'title',
  aliases: ["titlecase"],
  category: 'tools',
  description: "Convert text to Title Case.",
  usage: 'title <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *title <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => text.toLowerCase().replace(/\\b\\w/g,c=>c.toUpperCase()))(text2);
    await reply(sock, msg, out);
  },
};

export default command;
