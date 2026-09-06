import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupRepo } from '../../database/repositories/group.repo';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const unmuteUser: Command = {
  name: 'unmute-user',
  aliases: ['unmuteuser'],
  category: 'group',
  description: 'Unmute a previously muted user.',
  usage: 'unmute-user @user',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : undefined);
    if (!target) {
      await reply(sock, msg, 'ℹ️ Mention or reply to the user to unmute.');
      return;
    }
    const num = jidToNumber(target);
    groupRepo.unmuteUser(msg.chat, num);
    await sock.sendMessage(
      msg.chat,
      { text: `🔊 @${num} is unmuted.`, mentions: [target] },
      { quoted: msg.raw },
    );
  },
};

export default unmuteUser;
