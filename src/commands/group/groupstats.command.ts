import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { getGroupMetadata } from '../../services/group.service';
import { groupStatsRepo } from '../../database/repositories/groupstats.repo';
import { groupBrainRepo } from '../../database/repositories/groupbrain.repo';

/** Show privacy-preserving activity trends and top contributors. */
const groupstats: Command = {
  name: 'groupstats',
  aliases: ['gstats', 'activity', 'topmembers'],
  category: 'group',
  description: 'Show meaningful group activity trends and contributors.',
  usage: 'groupstats',
  groupOnly: true,
  async run({ sock, msg }) {
    const meta = await getGroupMetadata(sock, msg.chat);
    const total = groupStatsRepo.totalMessages(msg.chat);
    const summary = groupStatsRepo.summary(msg.chat, 7);
    const top = groupStatsRepo.top(msg.chat, 10).filter((member) => member.meaningfulCount > 0);
    const brain = groupBrainRepo.get(msg.chat);
    const onboarding = groupBrainRepo.onboardingCounts(msg.chat);

    if (total === 0) {
      await reply(sock, msg, '📊 No activity tracked yet. Stats start counting from now on.');
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((member, index) => {
      const rank = medals[index] ?? `${index + 1}.`;
      return `${rank} @${member.number} — ${member.meaningfulCount} meaningful msg`;
    });
    const trend = summary.changePct === undefined
      ? 'no prior baseline'
      : `${summary.changePct >= 0 ? '+' : ''}${summary.changePct}% vs previous 7 days`;

    const body = [
      `📊 *${meta.subject} — Activity*`,
      '',
      `👥 Members: *${meta.participants.length}*`,
      `💬 Messages seen: *${total}*`,
      `🗣️ Meaningful activity (7d): *${summary.meaningfulMessages}* · ${trend}`,
      `🔥 Highly active: *${summary.highlyActive}* · Active: *${summary.active}* · Light: *${summary.light}*`,
      ...(summary.peakDate ? [`📈 Peak: *${summary.peakDate}* (${summary.peakMessages})`] : []),
      ...(brain ? [`👋 Introductions: *${onboarding.completed}/${onboarding.tracked}*`] : []),
      '',
      '*Most active (meaningful messages):*',
      ...(lines.length ? lines : ['No meaningful activity recorded yet.']),
      '',
      '_Commands, bot output and system events are excluded from meaningful activity._',
    ].join('\n');

    await sock.sendMessage(
      msg.chat,
      { text: body, mentions: top.map((member) => `${member.number}@s.whatsapp.net`) },
      { quoted: msg.raw },
    );
  },
};

export default groupstats;
