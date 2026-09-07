import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { isBotAdmin } from '../../middleware/permission';

/** List pending join requests for the group (admin approval mode). */
const requests: Command = {
  name: 'requests',
  aliases: ['joinrequests', 'pending'],
  category: 'group',
  description: 'List pending join requests for this group.',
  usage: 'requests',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin to view join requests.');
      return;
    }
    try {
      const list = await sock.groupRequestParticipantsList(msg.chat);
      if (!list || list.length === 0) {
        await reply(sock, msg, '✅ No pending join requests.');
        return;
      }
      const jids = list.map((r: any) => r.jid);
      const body =
        `📥 *Pending join requests (${jids.length})*\n\n` +
        jids.map((j: string) => `➤ @${j.split('@')[0]}`).join('\n') +
        `\n\nApprove all: \`.acceptall\` · Reject all: \`.rejectall\``;
      await sock.sendMessage(
        msg.chat,
        { text: body, mentions: jids },
        { quoted: msg.raw },
      );
    } catch {
      await reply(sock, msg, '❌ Could not fetch join requests.');
    }
  },
};

export default requests;
