import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'bubble',
  aliases: ["bubbletext"],
  category: 'tools',
  description: "Wrap letters in bubbles.",
  usage: 'bubble <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *bubble <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => (() => { const m:Record<string,string>={a:'ⓐ',b:'ⓑ',c:'ⓒ',d:'ⓓ',e:'ⓔ',f:'ⓕ',g:'ⓖ',h:'ⓗ',i:'ⓘ',j:'ⓙ',k:'ⓚ',l:'ⓛ',m:'ⓜ',n:'ⓝ',o:'ⓞ',p:'ⓟ',q:'ⓠ',r:'ⓡ',s:'ⓢ',t:'ⓣ',u:'ⓤ',v:'ⓥ',w:'ⓦ',x:'ⓧ',y:'ⓨ',z:'ⓩ'}; return text.toLowerCase().split('').map(c=>m[c]||c).join(''); })())(text2);
    await reply(sock, msg, out);
  },
};

export default command;
