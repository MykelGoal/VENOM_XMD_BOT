import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'ascii',
  aliases: ["charcodes"],
  category: 'tools',
  description: "Show ASCII codes for each character.",
  usage: 'ascii <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *ascii <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => text.split('').map(c=>c.charCodeAt(0)).join(' '))(text2);
    await reply(sock, msg, out);
  },
};

export default command;
