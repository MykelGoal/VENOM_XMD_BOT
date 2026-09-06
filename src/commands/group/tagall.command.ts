import type { Command } from '../../types/command.type';
import { getGroupMetadata } from '../../services/group.service';

const tagall: Command = {
  name: 'tagall',
  aliases: ['everyone', 'mentionall'],
  category: 'group',
  description: 'Mention every member of the group.',
  usage: 'tagall [message]',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, text }) {
    const metadata = await getGroupMetadata(sock, msg.chat);
    const members = metadata.participants.map((p) => p.id);

    const body =
      `📢 *${text || 'Attention everyone'}*\n\n` +
      members.map((m) => `➤ @${m.split('@')[0]}`).join('\n');

    await sock.sendMessage(
      msg.chat,
      { text: body, mentions: members },
      { quoted: msg.raw },
    );
  },
};

export default tagall;
