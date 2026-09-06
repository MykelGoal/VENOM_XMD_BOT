import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import {
  economyRepo,
  cooldownLeft,
  fmtDuration,
  CURRENCY,
} from '../../database/repositories/economy.repo';

const COOLDOWN = 60 * 60 * 1000; // 1 hour
const JOBS = [
  'You drove for Uber and earned',
  'You fixed a bug in production and earned',
  'You sold jollof rice at the market and earned',
  'You did some freelance design and earned',
  'You streamed on Twitch and earned',
  'You delivered packages and earned',
];

const work: Command = {
  name: 'work',
  category: 'economy',
  description: 'Work a job for some coins (hourly).',
  usage: 'work',
  async run({ sock, msg }) {
    const u = economyRepo.get(msg.senderNumber);
    const left = cooldownLeft(u.lastWork, COOLDOWN);
    if (left > 0) {
      await reply(sock, msg, `⏳ You're tired. Work again in ${fmtDuration(left)}.`);
      return;
    }
    let earned = Math.floor(Math.random() * 400) + 200;
    // Laptop boosts income.
    if (u.inventory['laptop']) earned = Math.floor(earned * 1.5);
    u.wallet += earned;
    u.lastWork = Date.now();
    economyRepo.save(u);
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    await reply(sock, msg, `💼 ${job} ${CURRENCY} ${earned.toLocaleString()}!`);
  },
};

export default work;
