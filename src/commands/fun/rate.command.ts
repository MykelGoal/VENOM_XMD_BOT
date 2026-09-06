import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const rate: Command = {
  name: 'rate',
  category: 'fun',
  description: 'Rate anything out of 10.',
  usage: 'rate <thing>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *rate <thing>*');
      return;
    }
    const score = Math.floor(Math.random() * 11);
    await reply(sock, msg, `⭐ I rate *${text}* a *${score}/10*.`);
  },
};

export default rate;
