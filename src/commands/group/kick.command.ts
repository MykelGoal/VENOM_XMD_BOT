import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { removeParticipants } from '../../services/group.service';
import { isBotAdmin } from '../../middleware/permission';
import { numberToJid } from '../../utils/helpers';

const kick: Command = {
  name: 'kick',
  aliases: ['remove'],
  category: 'group',
  description: 'Remove a member from the group. Mention or reply to them.',
  usage: 'kick @user',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin to remove members.');
      return;
    }

    // Target from mentions, or the quoted message's sender.
    const targets =
      msg.mentions.length > 0
        ? msg.mentions
        : msg.quoted
          ? [numberToJid(msg.quoted.senderNumber)]
          : [];

    if (targets.length === 0) {
      await reply(sock, msg, 'ℹ️ Mention or reply to the user to kick.');
      return;
    }

    await removeParticipants(sock, msg.chat, targets);
    await reply(sock, msg, '✅ Done.');
  },
};

export default kick;
