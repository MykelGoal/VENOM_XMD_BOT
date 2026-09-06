import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { removeParticipants } from '../../services/group.service';
import { isBotAdmin } from '../../middleware/permission';
import { numberToJid } from '../../utils/helpers';

/** Kick by phone number (no need for them to be mentionable). */
const tkick: Command = {
  name: 'tkick',
  aliases: ['numkick'],
  category: 'group',
  description: 'Kick a member by their phone number.',
  usage: 'tkick <number>',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args }) {
    if (!args[0]) {
      await reply(sock, msg, 'ℹ️ Usage: *tkick <number>* (international, no +)');
      return;
    }
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin.');
      return;
    }
    const jid = numberToJid(args[0]);
    await removeParticipants(sock, msg.chat, [jid]);
    await reply(sock, msg, '✅ Done.');
  },
};

export default tkick;
