import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'morseencode',
  aliases: ["tomorse"],
  category: 'tools',
  description: "Encode text to Morse code.",
  usage: 'morseencode <text>',
  async run({ sock, msg, text, args }) {
    const input = (text || msg.quoted?.body || '').toUpperCase();
    if (!input) { await reply(sock, msg, 'ℹ️ Usage: *morseencode <text>*'); return; }
    const M: Record<string, string> = {A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',' ':'/'};
    await reply(sock, msg, input.split('').map(c => M[c] || '').join(' ').trim());
  },
};

export default command;
