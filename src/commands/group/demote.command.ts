import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { setParticipantRole } from '../../services/group.service';
import { isBotAdmin } from '../../middleware/permission';
import { numberToJid } from '../../utils/helpers';

const demote: Command = {
  name: 'demote',
  category: 'group',
  description: 'Demote an admin back to member. Mention or reply.',
  usage: 'demote @user',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin to demote members.');
      return;
    }
    const targets =
      msg.mentions.length > 0
        ? msg.mentions
        : msg.quoted
          ? [numberToJid(msg.quoted.senderNumber)]
          : [];
    if (targets.length === 0) {
      await reply(sock, msg, 'ℹ️ Mention or reply to the user to demote.');
      return;
    }
    await setParticipantRole(sock, msg.chat, targets, 'demote');
    await reply(sock, msg, '⬇️ Demoted.');
  },
};

export default demote;
