import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { isBotAdmin } from '../../middleware/permission';

const revoke: Command = {
  name: 'revoke',
  aliases: ['resetlink', 'revokelink'],
  category: 'group',
  description: 'Reset the group invite link.',
  usage: 'revoke',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin.');
      return;
    }
    await sock.groupRevokeInvite(msg.chat);
    await reply(sock, msg, '🔗 Group invite link has been reset.');
  },
};

export default revoke;
