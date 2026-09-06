import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'numguess',
  aliases: ["numberguess"],
  category: 'game',
  description: "Guess the number I picked (1-10).",
  usage: 'numguess <1-10>',
  async run({ sock, msg, text, args }) {
    const g = parseInt(args[0], 10);
    if (Number.isNaN(g) || g < 1 || g > 10) { await reply(sock, msg, 'ℹ️ Usage: *numguess <1-10>*'); return; }
    const n = Math.floor(Math.random() * 10) + 1;
    if (g === n) await reply(sock, msg, `🎉 Correct! It was ${n}.`);
    else await reply(sock, msg, `❌ Nope, it was ${n}. Try again!`);
  },
};

export default command;
