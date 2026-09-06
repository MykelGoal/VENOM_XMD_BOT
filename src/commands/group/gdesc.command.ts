import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { isBotAdmin } from '../../middleware/permission';

const gdesc: Command = {
  name: 'gdesc',
  aliases: ['setgdesc', 'setdesc'],
  category: 'group',
  description: 'Change the group description.',
  usage: 'gdesc <new description>',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *gdesc <new description>*');
      return;
    }
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin.');
      return;
    }
    await sock.groupUpdateDescription(msg.chat, text);
    await reply(sock, msg, '✅ Group description updated.');
  },
};

export default gdesc;
