import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'gay',
  aliases: ["howgay"],
  category: 'fun',
  description: "A fun 'gay meter' percentage.",
  usage: 'gay <name>',
  async run({ sock, msg, text, args }) {
    const name = text.trim() || msg.senderNumber || 'You';
    const pct = Math.floor(Math.random() * 101);
    const bar = '█'.repeat(Math.round(pct/10)) + '░'.repeat(10 - Math.round(pct/10));
    await reply(sock, msg, `🏳️‍🌈 *${name}* is *${pct}%* gay\n[${bar}]`);
  },
};

export default command;
