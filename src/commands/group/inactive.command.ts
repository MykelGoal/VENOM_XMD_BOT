import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { getGroupMetadata } from '../../services/group.service';
import { groupStatsRepo } from '../../database/repositories/groupstats.repo';
import { jidToNumber } from '../../utils/helpers';

/**
 * List members who have never sent a message (or none since tracking began).
 * Handy for cleaning up large groups. Does NOT kick — just reports.
 *   .inactive        → members with zero tracked messages
 *   .inactive 7      → members inactive for 7+ days
 */
const inactive: Command = {
  name: 'inactive',
  aliases: ['ghosts', 'inactivemembers'],
  category: 'group',
  description: 'List inactive/ghost members (no messages, or none in N days).',
  usage: 'inactive [days]',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args }) {
    const meta = await getGroupMetadata(sock, msg.chat);
    const days = parseInt(args[0] ?? '', 10);
    const now = Date.now();
    const cutoff = Number.isFinite(days) && days > 0 ? days * 86_400_000 : 0;

    const inactiveJids: string[] = [];
    for (const p of meta.participants) {
      const num = jidToNumber(p.id);
      const rec = groupStatsRepo.member(msg.chat, num);
      if (cutoff === 0) {
        // Never seen at all.
        if (!rec) inactiveJids.push(p.id);
      } else {
        // Seen, but not within the window (or never).
        if (!rec || now - rec.lastSeen > cutoff) inactiveJids.push(p.id);
      }
    }

    if (inactiveJids.length === 0) {
      await reply(sock, msg, '✅ No inactive members found. Lively group! 🎉');
      return;
    }

    const label =
      cutoff === 0
        ? 'never posted (since tracking began)'
        : `inactive for ${days}+ days`;
    const list = inactiveJids.map((j) => `➤ @${j.split('@')[0]}`).join('\n');
    const body =
      `👻 *Inactive members* (${inactiveJids.length}) — ${label}:\n\n${list}\n\n` +
      `_Note: tracking is best-effort and only counts messages seen since the bot joined._`;

    await sock.sendMessage(
      msg.chat,
      { text: body, mentions: inactiveJids },
      { quoted: msg.raw },
    );
  },
};

export default inactive;
