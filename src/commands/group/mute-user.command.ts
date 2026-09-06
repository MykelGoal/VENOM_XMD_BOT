import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupRepo } from '../../database/repositories/group.repo';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const muteUser: Command = {
  name: 'mute-user',
  aliases: ['muteuser'],
  category: 'group',
  description: "Mute a user — the bot deletes their messages (needs admin).",
  usage: 'mute-user @user',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : undefined);
    if (!target) {
      await reply(sock, msg, 'ℹ️ Mention or reply to the user to mute.');
      return;
    }
    const num = jidToNumber(target);
    groupRepo.muteUser(msg.chat, num);
    await sock.sendMessage(
      msg.chat,
      { text: `🔇 @${num} is muted. Their messages will be deleted.`, mentions: [target] },
      { quoted: msg.raw },
    );
  },
};

export default muteUser;
