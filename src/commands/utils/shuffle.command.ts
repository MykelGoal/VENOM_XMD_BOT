import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'shuffle',
  aliases: ["scramblelist"],
  category: 'tools',
  description: "Shuffle a list of items.",
  usage: 'shuffle a | b | c',
  async run({ sock, msg, text, args }) {
    const opts = text.split('|').map(s => s.trim()).filter(Boolean);
    if (opts.length < 2) { await reply(sock, msg, 'ℹ️ Usage: *shuffle a | b | c*'); return; }
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [opts[i],opts[j]]=[opts[j],opts[i]]; }
    await reply(sock, msg, '🔀 ' + opts.join(', '));
  },
};

export default command;
