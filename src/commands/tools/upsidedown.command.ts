import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'upsidedown',
  aliases: ["fliptext","fliptxt"],
  category: 'tools',
  description: "Flip text upside down.",
  usage: 'upsidedown <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *upsidedown <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => (() => { const m:Record<string,string>={a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'l',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z','.':'˙',',':"'",'?':'¿','!':'¡',"'":',','(':')',')':'('}; return text.toLowerCase().split('').map(c=>m[c]||c).reverse().join(''); })())(text2);
    await reply(sock, msg, out);
  },
};

export default command;
