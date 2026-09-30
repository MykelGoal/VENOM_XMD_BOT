import type { Command } from '../../types/command.type';
import { groupBrainRepo } from '../../database/repositories/groupbrain.repo';
import { flushMongo, isMongoEnabled } from '../../database/mongo';
import { reply } from '../../services/message.service';

const community: Command = {
  name: 'communitymanager',
  aliases: ['cmgr', 'autocommunity'],
  category: 'group',
  description: 'Control low-spam activities and private owner intelligence.',
  usage: 'communitymanager on|off|status|engagement on|off|digest on|off|weekly on|off',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args, prefix }) {
    const action = (args[0] ?? 'status').toLowerCase();
    const value = (args[1] ?? '').toLowerCase();
    const brain = groupBrainRepo.ensure(msg.chat);

    if (action === 'on' || action === 'off') {
      groupBrainRepo.setCommunityManager(msg.chat, action === 'on');
      await flushMongo();
      await reply(
        sock,
        msg,
        action === 'on'
          ? [
              '✅ *Community manager is ON.*',
              '• Low-spam activities: Tue/Thu/Sat, only when the group has been quiet',
              '• Quiet hours: no autonomous nighttime posts',
              '• Private daily owner brief: 9:00 PM Lagos (except Sunday)',
              '• Private weekly intelligence: Sunday 8:30 PM Lagos',
              '• No automatic group locking',
            ].join('\n')
          : '✅ Community manager is off. Saved profiles and activity aggregates were kept.',
      );
      return;
    }

    if (['engagement', 'digest', 'weekly'].includes(action) && ['on', 'off'].includes(value)) {
      groupBrainRepo.configureCommunityFeature(
        msg.chat,
        action as 'engagement' | 'digest' | 'weekly',
        value === 'on',
      );
      await flushMongo();
      await reply(sock, msg, `✅ Community ${action}: *${value.toUpperCase()}*`);
      return;
    }

    if (action !== 'status') {
      await reply(sock, msg, `ℹ️ Usage: *${prefix}communitymanager on|off|status|engagement on|off|digest on|off|weekly on|off*`);
      return;
    }

    await reply(
      sock,
      msg,
      [
        '🧭 *Community manager*',
        `Master: *${brain.communityManagerEnabled ? 'ON' : 'OFF'}*`,
        `Adaptive activities: *${brain.engagementEnabled ? 'ON' : 'OFF'}*`,
        `Daily private brief: *${brain.ownerDigestEnabled ? 'ON' : 'OFF'}*`,
        `Weekly intelligence/card: *${brain.weeklyActivityEnabled ? 'ON' : 'OFF'}*`,
        `Storage: *${isMongoEnabled() ? 'MongoDB (redeploy-safe)' : 'local only ⚠️'}*`,
        '',
        '_Activities have a one-per-day limit, run only on three days weekly, respect nighttime quiet hours and skip active chats._',
      ].join('\n'),
    );
  },
};

export default community;
