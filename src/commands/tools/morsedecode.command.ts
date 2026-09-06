import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'morsedecode',
  aliases: ["frommorse","demorse"],
  category: 'tools',
  description: "Decode Morse code to text.",
  usage: 'morsedecode <code>',
  async run({ sock, msg, text, args }) {
    const input = (text || '').trim();
    if (!input) { await reply(sock, msg, 'ℹ️ Usage: *morsedecode .... ..*'); return; }
    const M: Record<string, string> = {'.-':'A','-...':'B','-.-.':'C','-..':'D','.':'E','..-.':'F','--.':'G','....':'H','..':'I','.---':'J','-.-':'K','.-..':'L','--':'M','-.':'N','---':'O','.--.':'P','--.-':'Q','.-.':'R','...':'S','-':'T','..-':'U','...-':'V','.--':'W','-..-':'X','-.--':'Y','--..':'Z','-----':'0','.----':'1','..---':'2','...--':'3','....-':'4','.....':'5','-....':'6','--...':'7','---..':'8','----.':'9'};
    const out = input.split(' / ').map(w => w.split(/\s+/).map(c => M[c] || '').join('')).join(' ');
    await reply(sock, msg, out);
  },
};

export default command;
