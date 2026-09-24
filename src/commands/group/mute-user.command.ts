import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupRepo } from '../../database/repositories/group.repo';
import { isBotAdmin } from '../../middleware/permission';
import { jidToNumber } from '../../utils/helpers';

const muteUser: Command = {
  name: 'mute-user',
  aliases: ['muteuser', 'mute'],
  category: 'group',
  description: "Mute one member — the bot deletes their messages without removing them.",
  usage: 'mute @user (or reply to their message)',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(
        sock,
        msg,
        '🚫 I need to be a group admin before I can delete a muted member’s messages.',
      );
      return;
    }

    // Preserve the actual addressing JID. Reconstructing @s.whatsapp.net from
    // a quoted LID targets a different identity in newer WhatsApp groups.
    const target = msg.mentions[0] ?? msg.quoted?.sender;
    if (!target) {
      await reply(
        sock,
        msg,
        'ℹ️ Mention the member or reply to their message with *.mute*.',
      );
      return;
    }

    const id = jidToNumber(target);
    groupRepo.muteUser(msg.chat, id);
    await sock.sendMessage(
      msg.chat,
      {
        text: `🔇 @${id} is muted. Their new messages will be deleted, but they will remain in the group.`,
        mentions: [target],
      },
      { quoted: msg.raw },
    );
  },
};

export default muteUser;
