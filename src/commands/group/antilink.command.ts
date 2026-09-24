import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupRepo } from '../../database/repositories/group.repo';
import { isBotAdmin } from '../../middleware/permission';

const antilink: Command = {
  name: 'antilink',
  category: 'group',
  description: 'Delete links from everyone and remove non-admin link senders.',
  usage: 'antilink on | antilink off',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args }) {
    const arg = args[0]?.toLowerCase();
    if (arg !== 'on' && arg !== 'off') {
      const current = groupRepo.get(msg.chat)?.antilink ?? false;
      const readiness =
        current && !(await isBotAdmin(sock, msg.chat))
          ? '\n⚠️ It is enabled, but I cannot enforce it until I am a group admin.'
          : '';
      await reply(
        sock,
        msg,
        `ℹ️ Anti-link is currently *${current ? 'ON' : 'OFF'}*.${readiness}\nUsage: *antilink on* / *antilink off*`,
      );
      return;
    }

    const enabled = arg === 'on';
    groupRepo.setAntilink(msg.chat, enabled);

    if (enabled && !(await isBotAdmin(sock, msg.chat))) {
      await reply(
        sock,
        msg,
        '⚠️ Anti-link is *ON*, but I cannot delete links yet because WhatsApp does not report me as a group admin. Promote the bot, then run this command again.',
      );
      return;
    }

    await reply(
      sock,
      msg,
      enabled
        ? '✅ Anti-link turned *ON*. Links from admins and forwarded WhatsApp Channel posts will also be deleted.'
        : '✅ Anti-link turned *OFF*.',
    );
  },
};

export default antilink;
