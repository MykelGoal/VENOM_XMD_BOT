import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { getGroupMetadata } from '../../services/group.service';
import { groupStatsRepo } from '../../database/repositories/groupstats.repo';

/** Show group activity statistics: total messages and top active members. */
const groupstats: Command = {
  name: 'groupstats',
  aliases: ['gstats', 'activity', 'topmembers'],
  category: 'group',
  description: 'Show group activity: total messages and most active members.',
  usage: 'groupstats',
  groupOnly: true,
  async run({ sock, msg }) {
    const meta = await getGroupMetadata(sock, msg.chat);
    const total = groupStatsRepo.totalMessages(msg.chat);
    const top = groupStatsRepo.top(msg.chat, 10);

    if (total === 0) {
      await reply(
        sock,
        msg,
        '📊 No activity tracked yet. Stats start counting from now on.',
      );
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((m, i) => {
      const rank = medals[i] ?? `${i + 1}.`;
      return `${rank} @${m.number} — ${m.count} msg`;
    });

    const body =
      `📊 *${meta.subject} — Activity*\n\n` +
      `👥 Members: ${meta.participants.length}\n` +
      `💬 Tracked messages: ${total}\n\n` +
      `*Most active:*\n${lines.join('\n')}`;

    await sock.sendMessage(
      msg.chat,
      { text: body, mentions: top.map((m) => `${m.number}@s.whatsapp.net`) },
      { quoted: msg.raw },
    );
  },
};

export default groupstats;
