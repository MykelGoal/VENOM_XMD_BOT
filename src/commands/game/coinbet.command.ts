import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'coinbet',
  aliases: ["betcoin","coinflipbet"],
  category: 'game',
  description: "Bet heads or tails.",
  usage: 'coinbet <heads|tails>',
  async run({ sock, msg, text, args }) {
    const pick = (args[0] || '').toLowerCase();
    if (!['heads','tails','h','t'].includes(pick)) { await reply(sock, msg, 'ℹ️ Usage: *coinbet heads* or *coinbet tails*'); return; }
    const flip = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = pick[0] === flip[0];
    await reply(sock, msg, `🪙 It's ${flip}! You ${won ? 'WIN 🎉' : 'lose 😢'}`);
  },
};

export default command;
