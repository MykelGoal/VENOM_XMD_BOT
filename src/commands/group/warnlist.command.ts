import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { warnRepo } from '../../database/repositories/warn.repo';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const warnlist: Command = {
  name: 'warnlist',
  aliases: ['warns', 'checkwarn'],
  category: 'group',
  description: "Check a member's warnings.",
  usage: 'warnlist @user',
  groupOnly: true,
  async run({ sock, msg }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : numberToJid(msg.senderNumber));
    const num = jidToNumber(target);
    const record = warnRepo.get(msg.chat, num);
    if (!record || record.count === 0) {
      await sock.sendMessage(
        msg.chat,
        { text: `✅ @${num} has no warnings.`, mentions: [target] },
        { quoted: msg.raw },
      );
      return;
    }
    const reasons = record.reasons
      .map((r, i) => `${i + 1}. ${r}`)
      .join('\n');
    await sock.sendMessage(
      msg.chat,
      {
        text: `⚠️ *@${num}* — ${record.count} warning(s)\n\n${reasons}`,
        mentions: [target],
      },
      { quoted: msg.raw },
    );
  },
};

export default warnlist;
