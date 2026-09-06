import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { isBotAdmin } from '../../middleware/permission';

/** Open a group: everyone can send messages. */
const unlock: Command = {
  name: 'unlock',
  aliases: ['open', 'unmute'],
  category: 'group',
  description: 'Open the group so everyone can send messages.',
  usage: 'unlock',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin for that.');
      return;
    }
    await sock.groupSettingUpdate(msg.chat, 'not_announcement');
    await reply(sock, msg, '🔓 Group opened. Everyone can send messages.');
  },
};

export default unlock;
