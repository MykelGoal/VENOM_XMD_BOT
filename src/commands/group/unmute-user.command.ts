import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupRepo } from '../../database/repositories/group.repo';
import { jidToNumber } from '../../utils/helpers';

const unmuteUser: Command = {
  name: 'unmute-user',
  aliases: ['unmuteuser', 'unmute'],
  category: 'group',
  description: 'Unmute one member so their messages remain visible again.',
  usage: 'unmute @user (or reply to their message)',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    const target = msg.mentions[0] ?? msg.quoted?.sender;
    if (!target) {
      await reply(
        sock,
        msg,
        'ℹ️ Mention the member or reply to their message with *.unmute*.',
      );
      return;
    }

    const id = jidToNumber(target);
    groupRepo.unmuteUser(msg.chat, id);
    await sock.sendMessage(
      msg.chat,
      { text: `🔊 @${id} is unmuted.`, mentions: [target] },
      { quoted: msg.raw },
    );
  },
};

export default unmuteUser;
