import type { Command } from '../../types/command.type';
import { getGroupAdmins } from '../../services/group.service';

const listadmin: Command = {
  name: 'listadmin',
  aliases: ['admins', 'listadmins'],
  category: 'group',
  description: 'List all group admins.',
  usage: 'listadmin',
  groupOnly: true,
  async run({ sock, msg }) {
    const admins = await getGroupAdmins(sock, msg.chat);
    const text =
      `👑 *Group Admins (${admins.length})*\n\n` +
      admins.map((a) => `• @${a.split('@')[0]}`).join('\n');
    await sock.sendMessage(
      msg.chat,
      { text, mentions: admins },
      { quoted: msg.raw },
    );
  },
};

export default listadmin;
