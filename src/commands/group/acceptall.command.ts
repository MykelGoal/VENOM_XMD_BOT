import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { isBotAdmin } from '../../middleware/permission';

/** Approve every pending join request. */
const acceptall: Command = {
  name: 'acceptall',
  aliases: ['approveall', 'acceptrequests'],
  category: 'group',
  description: 'Approve all pending join requests.',
  usage: 'acceptall',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin to approve requests.');
      return;
    }
    try {
      const list = await sock.groupRequestParticipantsList(msg.chat);
      const jids = (list ?? []).map((r: any) => r.jid);
      if (jids.length === 0) {
        await reply(sock, msg, '✅ No pending requests to approve.');
        return;
      }
      await react(sock, msg, '⏳');
      await sock.groupRequestParticipantsUpdate(msg.chat, jids, 'approve');
      await react(sock, msg, '✅');
      await reply(sock, msg, `✅ Approved ${jids.length} join request(s).`);
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not approve the requests.');
    }
  },
};

export default acceptall;
