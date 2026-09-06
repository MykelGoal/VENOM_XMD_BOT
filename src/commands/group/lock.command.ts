import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { isBotAdmin } from '../../middleware/permission';

/** Close a group: only admins can send messages. */
const lock: Command = {
  name: 'lock',
  aliases: ['close', 'mute'],
  category: 'group',
  description: 'Close the group so only admins can send messages.',
  usage: 'lock',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin for that.');
      return;
    }
    await sock.groupSettingUpdate(msg.chat, 'announcement');
    await reply(sock, msg, '🔒 Group closed. Only admins can send messages.');
  },
};

export default lock;
