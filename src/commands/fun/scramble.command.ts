import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'scramble',
  aliases: ["wordscramble"],
  category: 'fun',
  description: "Scramble the letters of a word.",
  usage: 'scramble <word>',
  async run({ sock, msg, text, args }) {
    const w = (text || '').trim();
    if (!w) { await reply(sock, msg, 'ℹ️ Usage: *scramble <word>*'); return; }
    const arr = w.split('');
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    await reply(sock, msg, '🔤 ' + arr.join(''));
  },
};

export default command;
