import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import {
  economyRepo,
  cooldownLeft,
  fmtDuration,
  CURRENCY,
} from '../../database/repositories/economy.repo';

const COOLDOWN = 30 * 60 * 1000;
const WIN = [
  'You robbed a bank and got away with',
  'You ran a crypto scam and made',
  'You pickpocketed a tourist and got',
];
const LOSE = [
  'You got caught and paid a fine of',
  'The police fined you',
  'Your scheme flopped and cost you',
];

const crime: Command = {
  name: 'crime',
  category: 'economy',
  description: 'Commit a crime for a risky payout.',
  usage: 'crime',
  async run({ sock, msg }) {
    const u = economyRepo.get(msg.senderNumber);
    const left = cooldownLeft(u.lastCrime, COOLDOWN);
    if (left > 0) {
      await reply(sock, msg, `⏳ Lay low for ${fmtDuration(left)}.`);
      return;
    }
    u.lastCrime = Date.now();
    const success = Math.random() < 0.55;
    if (success) {
      const amt = Math.floor(Math.random() * 800) + 300;
      u.wallet += amt;
      economyRepo.save(u);
      const line = WIN[Math.floor(Math.random() * WIN.length)];
      await reply(sock, msg, `🦹 ${line} ${CURRENCY} ${amt.toLocaleString()}!`);
    } else {
      const fine = Math.floor(Math.random() * 500) + 100;
      u.wallet = Math.max(0, u.wallet - fine);
      economyRepo.save(u);
      const line = LOSE[Math.floor(Math.random() * LOSE.length)];
      await reply(sock, msg, `🚓 ${line} ${CURRENCY} ${fine.toLocaleString()}.`);
    }
  },
};

export default crime;
