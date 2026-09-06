import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'fancy',
  aliases: ["cursive","script"],
  category: 'tools',
  description: "Convert text to fancy cursive.",
  usage: 'fancy <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *fancy <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => (() => { const off=0x1D4B6-97,offU=0x1D49C-65; return text.split('').map(c=>{const o=c.charCodeAt(0); if(o>=97&&o<=122) return String.fromCodePoint(o+off); if(o>=65&&o<=90) return String.fromCodePoint(o+offU); return c;}).join(''); })())(text2);
    await reply(sock, msg, out);
  },
};

export default command;
