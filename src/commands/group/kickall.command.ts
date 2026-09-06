import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { getGroupMetadata, getGroupAdmins } from '../../services/group.service';
import { isBotAdmin } from '../../middleware/permission';
import { jidToNumber, sleep } from '../../utils/helpers';

/** Removes all non-admin members. Owner-only for safety. */
const kickall: Command = {
  name: 'kickall',
  category: 'group',
  description: 'Remove ALL non-admin members (owner only, use with care).',
  usage: 'kickall confirm',
  groupOnly: true,
  ownerOnly: true,
  async run({ sock, msg, args }) {
    if (args[0] !== 'confirm') {
      await reply(sock, msg, '⚠️ This removes everyone (except admins). Type *kickall confirm*.');
      return;
    }
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin.');
      return;
    }
    const md = await getGroupMetadata(sock, msg.chat);
    const admins = await getGroupAdmins(sock, msg.chat);
    const botNum = jidToNumber(sock.user?.id ?? '');
    const targets = md.participants
      .map((p) => p.id)
      .filter(
        (id) => !admins.includes(id) && jidToNumber(id) !== botNum,
      );

    await reply(sock, msg, `⚠️ Removing ${targets.length} members...`);
    for (const jid of targets) {
      try {
        await sock.groupParticipantsUpdate(msg.chat, [jid], 'remove');
        await sleep(800);
      } catch {
        /* skip */
      }
    }
    await reply(sock, msg, '✅ Done.');
  },
};

export default kickall;
