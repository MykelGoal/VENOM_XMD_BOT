import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupBrainRepo } from '../../database/repositories/groupbrain.repo';
import type {
  GroupBrainMode,
  NewcomerPhotoPolicy,
} from '../../database/models/groupbrain.model';
import { formatLagosEvent } from '../../services/groupbrain.service';

function numbersFrom(args: string[], mentions: string[]): string[] {
  return [
    ...mentions.map((jid) => jid.split('@')[0].split(':')[0]),
    ...args.map((arg) => arg.replace(/\D/g, '')).filter((arg) => arg.length >= 10),
  ];
}

const groupbrain: Command = {
  name: 'groupbrain',
  aliases: ['brain', 'communityai', 'groupai'],
  category: 'group',
  description: 'Teach and control the group-aware Venom assistant.',
  usage: 'groupbrain <on|off|status|purpose|teach|forget|rule|style|mode|photo|roomadmins>',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args }) {
    const sub = (args[0] ?? 'status').toLowerCase();
    const brain = groupBrainRepo.ensure(msg.chat);

    if (sub === 'on' || sub === 'enable') {
      groupBrainRepo.setEnabled(msg.chat, true);
      await reply(
        sock,
        msg,
        '🧠 *Group Brain is ON.*\n\nVenom will remember recent group context, use admin-approved knowledge and reply selectively. Teach a purpose with:\n`.brain purpose <what this group is for>`',
      );
      return;
    }
    if (sub === 'off' || sub === 'disable') {
      groupBrainRepo.setEnabled(msg.chat, false);
      await reply(sock, msg, '🧠 Group Brain is off. Saved official knowledge was kept.');
      return;
    }
    if (sub === 'mode') {
      const mode = (args[1] ?? '').toLowerCase() as GroupBrainMode;
      if (!['mentions', 'selective', 'active'].includes(mode)) {
        await reply(
          sock,
          msg,
          `Usage: *.brain mode mentions|selective|active*\nCurrent: *${brain.mode}*\n\n_Selective is recommended: useful without replying to every chat._`,
        );
        return;
      }
      groupBrainRepo.setMode(msg.chat, mode);
      await reply(sock, msg, `✅ Group Brain reply mode: *${mode}*`);
      return;
    }
    if (sub === 'purpose') {
      const value = args.slice(1).join(' ').trim();
      if (!value) {
        await reply(sock, msg, `🎯 Purpose: ${brain.purpose || '_not taught yet_'}`);
        return;
      }
      groupBrainRepo.setPurpose(msg.chat, value);
      await reply(sock, msg, `✅ I understand this group's purpose:\n_${value}_`);
      return;
    }
    if (sub === 'teach' || sub === 'remember') {
      const value = args.slice(1).join(' ').trim();
      if (!value) {
        await reply(sock, msg, 'Usage: *.brain teach <official fact>*');
        return;
      }
      const fact = groupBrainRepo.addFact(msg.chat, value, msg.senderNumber);
      await reply(sock, msg, fact ? `✅ Remembered: _${fact.text}_` : '❌ Nothing to remember.');
      return;
    }
    if (sub === 'forget') {
      const value = args.slice(1).join(' ').trim();
      const removed = groupBrainRepo.removeFacts(msg.chat, value);
      await reply(sock, msg, removed ? `🧹 Removed ${removed} matching fact(s).` : 'ℹ️ No matching official fact found.');
      return;
    }
    if (sub === 'rule') {
      const action = (args[1] ?? 'list').toLowerCase();
      const value = args.slice(2).join(' ').trim();
      if (action === 'add' && value) {
        groupBrainRepo.addRule(msg.chat, value);
        await reply(sock, msg, `✅ Rule saved: _${value}_`);
      } else if ((action === 'remove' || action === 'delete') && value) {
        const removed = groupBrainRepo.removeRule(msg.chat, value);
        await reply(sock, msg, removed ? `🧹 Removed ${removed} rule(s).` : 'ℹ️ No matching rule found.');
      } else {
        const current = groupBrainRepo.ensure(msg.chat).rules;
        await reply(
          sock,
          msg,
          current.length
            ? `📜 *Official rules*\n${current.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}`
            : '📜 No official rules taught yet.\nUse: *.brain rule add <rule>*',
        );
      }
      return;
    }
    if (sub === 'style') {
      const value = args.slice(1).join(' ').trim();
      if (!value) {
        await reply(
          sock,
          msg,
          brain.ownerStyle.length
            ? `🗣️ *Owner style*\n${brain.ownerStyle.map((rule) => `• ${rule}`).join('\n')}`
            : 'Usage: *.brain style <how Venom should speak/behave>*',
        );
        return;
      }
      groupBrainRepo.addStyle(msg.chat, value);
      await reply(sock, msg, `✅ Style learned: _${value}_`);
      return;
    }
    if (sub === 'photo') {
      const policy = (args[1] ?? '').toLowerCase() as NewcomerPhotoPolicy;
      if (!['off', 'record', 'review'].includes(policy)) {
        await reply(
          sock,
          msg,
          `Usage: *.brain photo off|record|review*\nCurrent: *${brain.newcomerPhotoPolicy}*\n• record — mark that an image was submitted\n• review — privately-safe AI check that it is a clear photo`,
        );
        return;
      }
      groupBrainRepo.setPhotoPolicy(msg.chat, policy);
      await reply(sock, msg, `✅ Newcomer picture policy: *${policy}*`);
      return;
    }
    if (sub === 'roomadmins') {
      const values = numbersFrom(args.slice(1), msg.mentions);
      if (!values.length) {
        await reply(
          sock,
          msg,
          brain.roomAdmins.length
            ? `🎮 Room admins: ${brain.roomAdmins.map((number) => `@${number}`).join(', ')}`
            : 'Reply with or mention the room admins:\n*.brain roomadmins @admin1 @admin2*',
        );
        return;
      }
      const updated = groupBrainRepo.setRoomAdmins(msg.chat, values);
      await sock.sendMessage(
        msg.chat,
        {
          text: `✅ Room admins saved: ${updated.roomAdmins.map((number) => `@${number}`).join(', ')}`,
          mentions: updated.roomAdmins.map((number) => `${number}@s.whatsapp.net`),
        },
        { quoted: msg.raw },
      );
      return;
    }
    if (sub === 'clearcontext' || (sub === 'clear' && args[1]?.toLowerCase() === 'context')) {
      groupBrainRepo.clearObservations(msg.chat);
      await reply(sock, msg, '🧹 Recent casual group context was cleared. Official facts and rules were kept.');
      return;
    }
    if (sub === 'knowledge' || sub === 'facts') {
      const current = groupBrainRepo.ensure(msg.chat);
      await reply(
        sock,
        msg,
        current.facts.length
          ? `🧠 *Official knowledge*\n${current.facts.map((fact) => `• [${fact.id}] ${fact.text}`).join('\n')}`
          : '🧠 No official facts taught yet.',
      );
      return;
    }
    if (sub === 'events') {
      const events = brain.events.filter((event) => event.status === 'scheduled');
      await reply(
        sock,
        msg,
        events.length
          ? `🗓️ *Scheduled events*\n${events.map((event) => `• [${event.id}] ${event.title} — ${formatLagosEvent(event.startsAt)}`).join('\n')}`
          : '🗓️ No upcoming event.',
      );
      return;
    }

    await reply(
      sock,
      msg,
      [
        '🧠 *Group Brain*',
        `Status: *${brain.enabled ? 'ON' : 'OFF'}*`,
        `Reply mode: *${brain.mode}*`,
        `Purpose: ${brain.purpose || '_not taught_'}`,
        `Knowledge: ${brain.facts.length} facts · ${brain.rules.length} rules`,
        `Recent context: ${brain.observations.length}/60 messages (48h maximum)`,
        `Newcomer pictures: *${brain.newcomerPhotoPolicy}*`,
        `Room admins: ${brain.roomAdmins.length}`,
        '',
        'Teach naturally: _“Venom, remember that…”_',
        'Or use: *.brain teach <fact>*',
      ].join('\n'),
    );
  },
};

export default groupbrain;
