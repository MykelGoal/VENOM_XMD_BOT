import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'atbash',
  aliases: [],
  category: 'tools',
  description: "Apply the Atbash cipher.",
  usage: 'atbash <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *atbash <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => text.replace(/[a-z]/gi,c=>{const U=c<='Z';const b=U?65:97;return String.fromCharCode(b+25-(c.charCodeAt(0)-b));}))(text2);
    await reply(sock, msg, out);
  },
};

export default command;
