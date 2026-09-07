import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { isBotAdmin } from '../../middleware/permission';

/** Reject every pending join request. */
const rejectall: Command = {
  name: 'rejectall',
  aliases: ['denyall', 'rejectrequests'],
  category: 'group',
  description: 'Reject all pending join requests.',
  usage: 'rejectall',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin to reject requests.');
      return;
    }
    try {
      const list = await sock.groupRequestParticipantsList(msg.chat);
      const jids = (list ?? []).map((r: any) => r.jid);
      if (jids.length === 0) {
        await reply(sock, msg, '✅ No pending requests to reject.');
        return;
      }
      await react(sock, msg, '⏳');
      await sock.groupRequestParticipantsUpdate(msg.chat, jids, 'reject');
      await react(sock, msg, '✅');
      await reply(sock, msg, `🚫 Rejected ${jids.length} join request(s).`);
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not reject the requests.');
    }
  },
};

export default rejectall;
