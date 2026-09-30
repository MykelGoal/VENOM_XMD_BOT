import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { getGroupMetadata } from '../../services/group.service';
import { groupStatsRepo } from '../../database/repositories/groupstats.repo';
import { groupBrainRepo } from '../../database/repositories/groupbrain.repo';
import { configuredProviders } from '../../services/ai.service';
import { isMongoEnabled } from '../../database/mongo';

function uptime(): string {
  const total = Math.floor(process.uptime());
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}m`]
    .filter(Boolean)
    .join(' ');
}

/** Operational statistics only—no growth counters or social promotion. */
const stats: Command = {
  name: 'stats',
  aliases: ['botstats'],
  category: 'general',
  description: 'Show operational or meaningful group activity statistics.',
  usage: 'stats',
  async run({ sock, msg }) {
    if (!msg.isGroup) {
      const providers = configuredProviders();
      await reply(
        sock,
        msg,
        [
          '📊 *Operational status*',
          `Uptime: *${uptime()}*`,
          `Durable storage: *${isMongoEnabled() ? 'MongoDB connected' : 'local only ⚠️'}*`,
          `Conversation providers: *${providers.length ? providers.join(' → ') : 'none configured'}*`,
        ].join('\n'),
      );
      return;
    }

    const metadata = await getGroupMetadata(sock, msg.chat);
    const summary = groupStatsRepo.summary(msg.chat, 7);
    const onboarding = groupBrainRepo.onboardingCounts(msg.chat);
    const quiet = Math.max(0, metadata.participants.length - summary.uniqueActive);
    const trend = summary.changePct === undefined
      ? 'new baseline'
      : `${summary.changePct >= 0 ? '+' : ''}${summary.changePct}% vs previous 7 days`;
    await reply(
      sock,
      msg,
      [
        `📊 *${metadata.subject} — 7-day activity*`,
        `Members: *${metadata.participants.length}*`,
        `Meaningful messages: *${summary.meaningfulMessages}* · ${trend}`,
        `Highly active: *${summary.highlyActive}*`,
        `Active: *${summary.active}*`,
        `Light: *${summary.light}*`,
        `Quiet: *${quiet}*`,
        `Introductions: *${onboarding.completed}/${onboarding.tracked}*`,
        ...(summary.peakDate ? [`Peak: *${summary.peakDate}* (${summary.peakMessages})`] : []),
        '',
        '_Commands, bot output, welcomes, reminders and system events are excluded._',
      ].join('\n'),
    );
  },
};

export default stats;
