import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'isprime',
  aliases: ["prime"],
  category: 'tools',
  description: "Check whether a number is prime.",
  usage: 'isprime <n>',
  async run({ sock, msg, text, args }) {
    const n = parseInt(args[0], 10);
    if (Number.isNaN(n) || n < 1) { await reply(sock, msg, 'ℹ️ Usage: *isprime <n>*'); return; }
    let prime = n > 1;
    for (let i = 2; i <= Math.sqrt(n); i++) { if (n % i === 0) { prime = false; break; } }
    await reply(sock, msg, prime ? `✅ ${n} is prime.` : `❌ ${n} is not prime.`);
  },
};

export default command;
