import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { getGroupMetadata, getGroupAdmins } from '../../services/group.service';

const groupinfo: Command = {
  name: 'groupinfo',
  aliases: ['ginfo'],
  category: 'group',
  description: 'Show information about the current group.',
  usage: 'groupinfo',
  groupOnly: true,
  async run({ sock, msg }) {
    const md = await getGroupMetadata(sock, msg.chat);
    const admins = await getGroupAdmins(sock, msg.chat);
    const text = [
      `👥 *${md.subject}*`,
      '',
      `🆔 ${md.id}`,
      `👤 Members: ${md.participants.length}`,
      `👑 Admins: ${admins.length}`,
      md.desc ? `\n📝 ${md.desc}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    await reply(sock, msg, text);
  },
};

export default groupinfo;
