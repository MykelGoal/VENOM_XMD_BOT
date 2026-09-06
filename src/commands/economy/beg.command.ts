import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import {
  economyRepo,
  cooldownLeft,
  fmtDuration,
  CURRENCY,
} from '../../database/repositories/economy.repo';

const COOLDOWN = 5 * 60 * 1000;
const DONORS = ['A kind stranger', 'Elon Musk', 'Your ex', 'A random uncle', 'Santa'];

const beg: Command = {
  name: 'beg',
  category: 'economy',
  description: 'Beg for some coins.',
  usage: 'beg',
  async run({ sock, msg }) {
    const u = economyRepo.get(msg.senderNumber);
    const left = cooldownLeft(u.lastBeg, COOLDOWN);
    if (left > 0) {
      await reply(sock, msg, `⏳ Have some dignity. Wait ${fmtDuration(left)}.`);
      return;
    }
    u.lastBeg = Date.now();
    if (Math.random() < 0.2) {
      economyRepo.save(u);
      await reply(sock, msg, '🙅 Nobody gave you anything. Ouch.');
      return;
    }
    const amt = Math.floor(Math.random() * 150) + 20;
    u.wallet += amt;
    economyRepo.save(u);
    const donor = DONORS[Math.floor(Math.random() * DONORS.length)];
    await reply(sock, msg, `🥺 ${donor} gave you ${CURRENCY} ${amt.toLocaleString()}.`);
  },
};

export default beg;
