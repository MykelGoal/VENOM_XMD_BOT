import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { isBotAdmin } from '../../middleware/permission';

const invite: Command = {
  name: 'invite',
  aliases: ['link', 'grouplink'],
  category: 'group',
  description: 'Get the group invite link.',
  usage: 'invite',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin to fetch the link.');
      return;
    }
    const code = await sock.groupInviteCode(msg.chat);
    await reply(sock, msg, `🔗 https://chat.whatsapp.com/${code}`);
  },
};

export default invite;
