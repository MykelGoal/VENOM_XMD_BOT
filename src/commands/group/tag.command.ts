import type { Command } from '../../types/command.type';
import { getGroupMetadata } from '../../services/group.service';

/**
 * Hidden tag — notifies everyone without showing a wall of @mentions.
 * Great for announcements.
 */
const tag: Command = {
  name: 'tag',
  aliases: ['hidetag'],
  category: 'group',
  description: 'Silently tag all members with a message.',
  usage: 'tag <message>',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, text }) {
    const metadata = await getGroupMetadata(sock, msg.chat);
    const members = metadata.participants.map((p) => p.id);
    await sock.sendMessage(
      msg.chat,
      {
        text: text || msg.quoted?.body || '📢',
        mentions: members,
      },
      { quoted: msg.raw },
    );
  },
};

export default tag;
