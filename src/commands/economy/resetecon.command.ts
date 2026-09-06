import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo } from '../../database/repositories/economy.repo';

const resetecon: Command = {
  name: 'resetecon',
  aliases: ['reseteconomy'],
  category: 'economy',
  description: 'Owner: wipe all economy data.',
  usage: 'resetecon confirm',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    if (args[0] !== 'confirm') {
      await reply(sock, msg, '⚠️ This wipes ALL economy data. Type *resetecon confirm* to proceed.');
      return;
    }
    economyRepo.resetAll();
    await reply(sock, msg, '🗑️ Economy has been reset.');
  },
};

export default resetecon;
