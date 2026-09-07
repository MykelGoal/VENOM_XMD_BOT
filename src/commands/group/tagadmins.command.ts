import type { Command } from '../../types/command.type';
import { getGroupAdmins } from '../../services/group.service';
import { reply } from '../../services/message.service';

/** Ping all group admins (e.g. to report an issue). */
const tagadmins: Command = {
  name: 'tagadmins',
  aliases: ['admin', 'reportadmin', 'calladmin'],
  category: 'group',
  description: 'Mention all group admins (e.g. to report something).',
  usage: 'tagadmins [message]',
  groupOnly: true,
  async run({ sock, msg, text }) {
    const admins = await getGroupAdmins(sock, msg.chat);
    if (admins.length === 0) {
      await reply(sock, msg, 'ℹ️ No admins found.');
      return;
    }
    const header = text?.trim()
      ? `🚨 *Admin call:* ${text.trim()}`
      : '🚨 *Admins needed here!*';
    const body = `${header}\n\n` + admins.map((a) => `➤ @${a.split('@')[0]}`).join('\n');
    await sock.sendMessage(
      msg.chat,
      { text: body, mentions: admins },
      { quoted: msg.raw },
    );
  },
};

export default tagadmins;
