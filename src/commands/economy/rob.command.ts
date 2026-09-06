import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import {
  economyRepo,
  cooldownLeft,
  fmtDuration,
  CURRENCY,
} from '../../database/repositories/economy.repo';
import { jidToNumber } from '../../utils/helpers';

const COOLDOWN = 60 * 60 * 1000;

const rob: Command = {
  name: 'rob',
  aliases: ['steal'],
  category: 'economy',
  description: 'Attempt to rob another user (risky!).',
  usage: 'rob @user',
  async run({ sock, msg }) {
    const target = msg.mentions[0];
    if (!target) {
      await reply(sock, msg, 'ℹ️ Usage: *rob @user*');
      return;
    }
    const victimNum = jidToNumber(target);
    if (victimNum === msg.senderNumber) {
      await reply(sock, msg, "❌ You can't rob yourself.");
      return;
    }
    const u = economyRepo.get(msg.senderNumber);
    const left = cooldownLeft(u.lastRob, COOLDOWN);
    if (left > 0) {
      await reply(sock, msg, `⏳ Too risky right now. Wait ${fmtDuration(left)}.`);
      return;
    }
    const victim = economyRepo.get(victimNum);
    if (victim.wallet < 100) {
      await reply(sock, msg, '❌ They are too broke to rob.');
      return;
    }
    u.lastRob = Date.now();
    // Lockpick improves odds.
    const successChance = u.inventory['lockpick'] ? 0.6 : 0.45;
    const success = Math.random() < successChance;
    if (success) {
      const stolen = Math.floor(victim.wallet * (Math.random() * 0.3 + 0.1));
      victim.wallet -= stolen;
      u.wallet += stolen;
      economyRepo.save(victim);
      economyRepo.save(u);
      await sock.sendMessage(
        msg.chat,
        {
          text: `🦹 You robbed @${victimNum} and stole ${CURRENCY} ${stolen.toLocaleString()}!`,
          mentions: [target],
        },
        { quoted: msg.raw },
      );
    } else {
      const fine = Math.floor(Math.random() * 400) + 100;
      u.wallet = Math.max(0, u.wallet - fine);
      economyRepo.save(u);
      await reply(sock, msg, `🚓 You got caught and paid ${CURRENCY} ${fine.toLocaleString()} in bail.`);
    }
  },
};

export default rob;
