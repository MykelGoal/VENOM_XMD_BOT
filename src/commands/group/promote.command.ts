import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { setParticipantRole } from '../../services/group.service';
import { isBotAdmin } from '../../middleware/permission';
import { numberToJid } from '../../utils/helpers';

const promote: Command = {
  name: 'promote',
  category: 'group',
  description: 'Promote a member to group admin. Mention or reply.',
  usage: 'promote @user',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin to promote members.');
      return;
    }

    const targets =
      msg.mentions.length > 0
        ? msg.mentions
        : msg.quoted
          ? [numberToJid(msg.quoted.senderNumber)]
          : [];

    if (targets.length === 0) {
      await reply(sock, msg, 'ℹ️ Mention or reply to the user to promote.');
      return;
    }

    await setParticipantRole(sock, msg.chat, targets, 'promote');
    await reply(sock, msg, '⬆️ Promoted.');
  },
};

export default promote;
