import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { warnRepo } from '../../database/repositories/warn.repo';
import { isBotAdmin } from '../../middleware/permission';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const MAX_WARNS = 3;

const warn: Command = {
  name: 'warn',
  category: 'group',
  description: `Warn a member. At ${MAX_WARNS} warns they are removed.`,
  usage: 'warn @user [reason]',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, text }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : undefined);
    if (!target) {
      await reply(sock, msg, 'ℹ️ Mention or reply to the user to warn.');
      return;
    }
    const num = jidToNumber(target);
    const reason = text.replace(/@\d+/g, '').trim();
    const count = warnRepo.add(msg.chat, num, reason);

    await sock.sendMessage(
      msg.chat,
      {
        text: `⚠️ @${num} warned (${count}/${MAX_WARNS})\n📝 ${reason || 'No reason'}`,
        mentions: [target],
      },
      { quoted: msg.raw },
    );

    if (count >= MAX_WARNS) {
      if (await isBotAdmin(sock, msg.chat)) {
        await sock.groupParticipantsUpdate(msg.chat, [target], 'remove');
        warnRepo.reset(msg.chat, num);
        await sock.sendMessage(msg.chat, {
          text: `🚫 @${num} reached ${MAX_WARNS} warns and was removed.`,
          mentions: [target],
        });
      } else {
        await reply(sock, msg, '⚠️ Warn limit reached, but I need admin to remove them.');
      }
    }
  },
};

export default warn;
