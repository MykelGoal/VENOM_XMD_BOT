import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'iq',
  aliases: ["iqtest"],
  category: 'fun',
  description: "Test someone's (random) IQ.",
  usage: 'iq <name>',
  async run({ sock, msg, text, args }) {
    const name = text.trim() || msg.senderNumber || 'You';
    const iq = 60 + Math.floor(Math.random() * 100);
    await reply(sock, msg, `🧠 *${name}* has an IQ of *${iq}*`);
  },
};

export default command;
