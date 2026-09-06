import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { isBotAdmin } from '../../middleware/permission';

const gname: Command = {
  name: 'gname',
  aliases: ['setgname', 'subject'],
  category: 'group',
  description: 'Change the group name.',
  usage: 'gname <new name>',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *gname <new name>*');
      return;
    }
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin.');
      return;
    }
    await sock.groupUpdateSubject(msg.chat, text);
    await reply(sock, msg, `✅ Group name changed to *${text}*.`);
  },
};

export default gname;
