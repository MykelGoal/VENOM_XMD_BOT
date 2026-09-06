import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'tiny',
  aliases: ["smallcaps","small"],
  category: 'tools',
  description: "Convert text to tiny small-caps.",
  usage: 'tiny <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *tiny <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => (() => { const m:Record<string,string>={a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'}; return text.toLowerCase().split('').map(c=>m[c]||c).join(''); })())(text2);
    await reply(sock, msg, out);
  },
};

export default command;
