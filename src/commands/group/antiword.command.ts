import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupRepo } from '../../database/repositories/group.repo';

const antiword: Command = {
  name: 'antiword',
  aliases: ['badword', 'filterword'],
  category: 'group',
  description: 'Manage banned words. Deletes messages containing them.',
  usage: 'antiword on|off | add <word> | del <word> | list',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args }) {
    const sub = args[0]?.toLowerCase();
    const g = groupRepo.ensure(msg.chat);

    switch (sub) {
      case 'on':
      case 'off':
        groupRepo.setFlag(msg.chat, 'antiword', sub === 'on');
        await reply(sock, msg, `✅ Anti-word turned *${sub.toUpperCase()}*.`);
        return;
      case 'add': {
        const word = args[1];
        if (!word) {
          await reply(sock, msg, 'ℹ️ Usage: *antiword add <word>*');
          return;
        }
        groupRepo.addBannedWord(msg.chat, word);
        await reply(sock, msg, `✅ Added "${word}" to banned words.`);
        return;
      }
      case 'del':
      case 'remove': {
        const word = args[1];
        if (!word) {
          await reply(sock, msg, 'ℹ️ Usage: *antiword del <word>*');
          return;
        }
        groupRepo.removeBannedWord(msg.chat, word);
        await reply(sock, msg, `🗑️ Removed "${word}" from banned words.`);
        return;
      }
      case 'list':
        await reply(
          sock,
          msg,
          g.bannedWords.length
            ? `🚫 *Banned words:*\n${g.bannedWords.join(', ')}`
            : 'No banned words set.',
        );
        return;
      default:
        await reply(
          sock,
          msg,
          `ℹ️ Anti-word is *${g.antiword ? 'ON' : 'OFF'}*.\nUsage:\n• antiword on/off\n• antiword add <word>\n• antiword del <word>\n• antiword list`,
        );
    }
  },
};

export default antiword;
