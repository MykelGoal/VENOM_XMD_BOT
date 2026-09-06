import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'bold',
  aliases: ["boldtext"],
  category: 'tools',
  description: "Convert text to bold unicode.",
  usage: 'bold <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *bold <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => (() => { return text.split('').map(c=>{const o=c.charCodeAt(0); if(o>=97&&o<=122) return String.fromCodePoint(0x1D5EE+o-97); if(o>=65&&o<=90) return String.fromCodePoint(0x1D5D4+o-65); if(o>=48&&o<=57) return String.fromCodePoint(0x1D7EC+o-48); return c;}).join(''); })())(text2);
    await reply(sock, msg, out);
  },
};

export default command;
