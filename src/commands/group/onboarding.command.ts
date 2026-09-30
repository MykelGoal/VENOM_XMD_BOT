import type { Command } from '../../types/command.type';
import { groupBrainRepo } from '../../database/repositories/groupbrain.repo';
import { flushMongo, isMongoEnabled } from '../../database/mongo';
import { getGroupMetadata } from '../../services/group.service';
import { onboardingPrompt } from '../../services/onboarding.service';
import { reply } from '../../services/message.service';
import { jidToNumber } from '../../utils/helpers';
import { isOwner } from '../../middleware/permission';

const onboarding: Command = {
  name: 'onboarding',
  aliases: ['introductions', 'introsetup'],
  category: 'group',
  description: 'Manage newcomer introductions and the one-time member introduction campaign.',
  usage: 'onboarding start confirm | on | off | status | stop',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args, prefix }) {
    const action = (args[0] ?? 'status').toLowerCase();
    const brain = groupBrainRepo.ensure(msg.chat);

    if (action === 'status') {
      const counts = groupBrainRepo.onboardingCounts(msg.chat);
      await reply(
        sock,
        msg,
        [
          '👋 *Member introductions*',
          `Automatic onboarding: *${brain.onboardingEnabled ? 'ON' : 'OFF'}*`,
          `Current campaign: *${brain.onboardingCampaignActive ? 'ACTIVE' : 'OFF'}*`,
          `Completed: *${counts.completed}/${counts.tracked}*`,
          `Pending: *${counts.pending}*`,
          `UID verified: *${counts.verified}*`,
          `Storage: *${isMongoEnabled() ? 'MongoDB (redeploy-safe)' : 'local only ⚠️'}*`,
        ].join('\n'),
      );
      return;
    }

    if (action === 'on' || action === 'off') {
      groupBrainRepo.setOnboardingEnabled(msg.chat, action === 'on');
      await flushMongo();
      await reply(
        sock,
        msg,
        action === 'on'
          ? '✅ Future newcomers will be asked for a short Free Fire introduction.'
          : '✅ Automatic newcomer introductions are off. Existing saved profiles were not deleted.',
      );
      return;
    }

    if (action === 'stop') {
      groupBrainRepo.stopOnboardingCampaign(msg.chat);
      await flushMongo();
      await reply(sock, msg, '✅ The current introduction campaign is stopped. Future-newcomer onboarding remains available.');
      return;
    }

    if (action !== 'start') {
      await reply(sock, msg, `ℹ️ Usage: *${prefix}onboarding start confirm | on | off | status | stop*`);
      return;
    }

    if (!isOwner(msg.senderNumber)) {
      await reply(sock, msg, '🚫 Only the configured owner can confirm the one-time everyone introduction campaign.');
      return;
    }

    if (brain.onboardingCampaignStartedAt) {
      await reply(
        sock,
        msg,
        `ℹ️ This group’s one-time introduction campaign was already launched on *${new Date(brain.onboardingCampaignStartedAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}*. I will not tag everyone again. Use *${prefix}onboarding status* to track completion.`,
      );
      return;
    }

    if ((args[1] ?? '').toLowerCase() !== 'confirm') {
      await reply(
        sock,
        msg,
        [
          '⚠️ This starts a one-time introduction campaign and hidden-tags current members once.',
          `If the group is ready, send: *${prefix}onboarding start confirm*`,
          '_It will not repeatedly tag everyone._',
        ].join('\n'),
      );
      return;
    }

    const metadata = await getGroupMetadata(sock, msg.chat);
    const botNumbers = new Set(
      [sock.user?.id, sock.user?.lid].filter(Boolean).map((jid) => jidToNumber(jid!)),
    );
    const participants = metadata.participants.filter((participant) =>
      ![participant.id, participant.jid, participant.lid]
        .filter(Boolean)
        .some((jid) => botNumbers.has(jidToNumber(jid!))),
    );
    const trackingIdentities = participants.map(
      (participant) => participant.jid ?? participant.id,
    );
    const mentionTargets = participants.map((participant) => participant.id);

    groupBrainRepo.startOnboardingCampaign(msg.chat, trackingIdentities);
    await flushMongo();
    await sock.sendMessage(
      msg.chat,
      {
        text: [
          '👋 *GROUP INTRODUCTION RESET*',
          'We’re organising the group properly. Every member should send one introduction in this group.',
          '',
          onboardingPrompt(),
          '',
          '_Venom records each introduction once. No repeated everyone-tags._',
        ].join('\n'),
        mentions: mentionTargets,
      },
      { quoted: msg.raw },
    );
  },
};

export default onboarding;
