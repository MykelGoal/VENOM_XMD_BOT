import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'rot13',
  aliases: ["rot"],
  category: 'tools',
  description: "Apply the ROT13 cipher.",
  usage: 'rot13 <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *rot13 <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => text.replace(/[a-z]/gi,c=>String.fromCharCode((c<='Z'?90:122)>=(c.charCodeAt(0)+13)?c.charCodeAt(0)+13:c.charCodeAt(0)-13)))(text2);
    await reply(sock, msg, out);
  },
};

export default command;
