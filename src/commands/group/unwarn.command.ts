import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { warnRepo } from '../../database/repositories/warn.repo';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const unwarn: Command = {
  name: 'unwarn',
  aliases: ['resetwarn'],
  category: 'group',
  description: 'Clear all warnings for a member.',
  usage: 'unwarn @user',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : undefined);
    if (!target) {
      await reply(sock, msg, 'ℹ️ Mention or reply to the user.');
      return;
    }
    const num = jidToNumber(target);
    warnRepo.reset(msg.chat, num);
    await sock.sendMessage(
      msg.chat,
      { text: `✅ Warnings cleared for @${num}.`, mentions: [target] },
      { quoted: msg.raw },
    );
  },
};

export default unwarn;
