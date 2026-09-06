import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'leet',
  aliases: ["1337"],
  category: 'tools',
  description: "Convert text to leetspeak.",
  usage: 'leet <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *leet <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => (() => { const m:Record<string,string>={a:'4',e:'3',i:'1',o:'0',t:'7',s:'5',g:'9',b:'8'}; return text.toLowerCase().split('').map(c=>m[c]||c).join(''); })())(text2);
    await reply(sock, msg, out);
  },
};

export default command;
