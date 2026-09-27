import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupBrainRepo } from '../../database/repositories/groupbrain.repo';
import {
  formatLagosEvent,
  parseLagosMatchTime,
} from '../../services/groupbrain.service';

const roommatch: Command = {
  name: 'roommatch',
  aliases: ['matchroom', 'custommatch'],
  category: 'group',
  description: 'Schedule a durable Free Fire room match and reminders.',
  usage: 'roommatch <time> [title] | roommatch list | roommatch cancel <id>',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args, text }) {
    const sub = (args[0] ?? '').toLowerCase();
    let brain = groupBrainRepo.ensure(msg.chat);
    if (!brain.enabled) brain = groupBrainRepo.setEnabled(msg.chat, true);

    if (sub === 'list') {
      const events = brain.events.filter((event) => event.status === 'scheduled');
      await reply(
        sock,
        msg,
        events.length
          ? `🎮 *Upcoming room matches*\n${events.map((event) => `• [${event.id}] ${event.title} — ${formatLagosEvent(event.startsAt)}`).join('\n')}`
          : '🎮 No room match scheduled.',
      );
      return;
    }

    if (sub === 'cancel') {
      const id = args[1] ?? '';
      const event = groupBrainRepo.updateEvent(msg.chat, id, { status: 'cancelled' });
      await reply(sock, msg, event ? `🚫 Cancelled: *${event.title}*` : '❌ Match event not found. Use *.roommatch list*.');
      return;
    }

    const startsAt = parseLagosMatchTime(`room match ${text}`);
    if (!startsAt) {
      await reply(
        sock,
        msg,
        'Usage: *.roommatch 9pm* or *.roommatch tomorrow 8:30pm CS Squad*\n_Time is interpreted in Lagos time._',
      );
      return;
    }
    const title = text
      .replace(/\b(today|tonight|tomorrow)\b/gi, '')
      .replace(/\b([01]?\d|2[0-3]):[0-5]\d\s*(?:am|pm)?\b/i, '')
      .replace(/\b([01]?\d)\s*(?:am|pm)\b/i, '')
      .replace(/\b(?:by|at)\s+([01]?\d|2[0-3])\b/i, '')
      .trim() || 'Room match';
    const event = groupBrainRepo.addEvent(msg.chat, {
      kind: 'room-match',
      title,
      startsAt,
      createdBy: msg.senderNumber,
    });
    await reply(
      sock,
      msg,
      `✅ *${event.title} scheduled*\n🕘 ${formatLagosEvent(event.startsAt)} (Lagos)\n\nI’ll remind room admins 30 minutes before and the group 10 minutes before.${brain.roomAdmins.length ? '' : '\n⚠️ Set room admins with *.brain roomadmins @admin1 @admin2*.'}`,
    );
  },
};

export default roommatch;
