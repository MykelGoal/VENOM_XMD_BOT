import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { addParticipants } from '../../services/group.service';
import { isBotAdmin } from '../../middleware/permission';
import { numberToJid } from '../../utils/helpers';

const add: Command = {
  name: 'add',
  category: 'group',
  description: 'Add a member to the group by number.',
  usage: 'add 2348012345678',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin to add members.');
      return;
    }

    if (!args[0]) {
      await reply(sock, msg, 'ℹ️ Usage: add <number> (international format).');
      return;
    }

    const jids = args.map((n) => numberToJid(n));
    try {
      await addParticipants(sock, msg.chat, jids);
      await reply(sock, msg, '✅ Add request sent.');
    } catch {
      await reply(
        sock,
        msg,
        '⚠️ Could not add — their privacy settings may require an invite link.',
      );
    }
  },
};

export default add;
