import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupRepo } from '../../database/repositories/group.repo';

const welcome: Command = {
  name: 'welcome',
  category: 'group',
  description: 'Toggle welcome/goodbye messages for this group.',
  usage: 'welcome on | welcome off',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args }) {
    const arg = args[0]?.toLowerCase();
    if (arg !== 'on' && arg !== 'off') {
      const current = groupRepo.get(msg.chat)?.welcome ?? false;
      await reply(
        sock,
        msg,
        `ℹ️ Welcome messages are currently *${current ? 'ON' : 'OFF'}*.\nUsage: *welcome on* / *welcome off*`,
      );
      return;
    }
    groupRepo.setWelcome(msg.chat, arg === 'on');
    await reply(sock, msg, `✅ Welcome messages turned *${arg.toUpperCase()}*.`);
  },
};

export default welcome;
