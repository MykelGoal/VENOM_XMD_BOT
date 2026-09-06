import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';

const bankupgrade: Command = {
  name: 'bankupgrade',
  aliases: ['upgradebank'],
  category: 'economy',
  description: 'Increase your bank storage capacity.',
  usage: 'bankupgrade',
  async run({ sock, msg }) {
    const u = economyRepo.get(msg.senderNumber);
    // Cost scales with current capacity.
    const cost = Math.floor(u.bankCap * 0.5);
    if (u.wallet < cost) {
      await reply(sock, msg, `❌ Upgrade costs ${CURRENCY} ${cost.toLocaleString()}. You have ${CURRENCY} ${u.wallet.toLocaleString()}.`);
      return;
    }
    u.wallet -= cost;
    u.bankCap += 10000;
    economyRepo.save(u);
    await reply(sock, msg, `🏦 Bank upgraded! New capacity: ${CURRENCY} ${u.bankCap.toLocaleString()}.`);
  },
};

export default bankupgrade;
