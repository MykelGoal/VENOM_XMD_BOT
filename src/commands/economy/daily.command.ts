import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import {
  economyRepo,
  cooldownLeft,
  fmtDuration,
  CURRENCY,
} from '../../database/repositories/economy.repo';

const DAY = 24 * 60 * 60 * 1000;

const daily: Command = {
  name: 'daily',
  category: 'economy',
  description: 'Claim your daily reward (streak bonus included).',
  usage: 'daily',
  async run({ sock, msg }) {
    const u = economyRepo.get(msg.senderNumber);
    const left = cooldownLeft(u.lastDaily, DAY);
    if (left > 0) {
      await reply(sock, msg, `⏳ Already claimed. Come back in ${fmtDuration(left)}.`);
      return;
    }
    // Reset streak if they missed a day (>48h).
    const missed = Date.now() - u.lastDaily > 2 * DAY;
    u.streak = missed ? 1 : u.streak + 1;
    const base = 1000;
    const bonus = Math.min(u.streak * 100, 2000);
    const total = base + bonus;
    u.wallet += total;
    u.lastDaily = Date.now();
    economyRepo.save(u);
    await reply(
      sock,
      msg,
      `🎁 *Daily claimed!*\n\n${CURRENCY} +${total.toLocaleString()} (base ${base} + streak ${bonus})\n🔥 Streak: ${u.streak} day(s)`,
    );
  },
};

export default daily;
