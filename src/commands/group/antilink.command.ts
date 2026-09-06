import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupRepo } from '../../database/repositories/group.repo';

const antilink: Command = {
  name: 'antilink',
  category: 'group',
  description: 'Toggle anti-link protection (auto-remove link senders).',
  usage: 'antilink on | antilink off',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args }) {
    const arg = args[0]?.toLowerCase();
    if (arg !== 'on' && arg !== 'off') {
      const current = groupRepo.get(msg.chat)?.antilink ?? false;
      await reply(
        sock,
        msg,
        `ℹ️ Anti-link is currently *${current ? 'ON' : 'OFF'}*.\nUsage: *antilink on* / *antilink off*`,
      );
      return;
    }
    groupRepo.setAntilink(msg.chat, arg === 'on');
    await reply(sock, msg, `✅ Anti-link turned *${arg.toUpperCase()}*.`);
  },
};

export default antilink;
