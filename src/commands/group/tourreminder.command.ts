import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  canManageTournament,
  flushTournament,
  tournamentErrorMessage,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourreminder: Command = {
  name: 'tourreminder',
  category: 'group',
  description: 'View, change or disable the daily Lagos-time tournament reminder.',
  usage: 'tourreminder <code> [HH:MM|off]',
  async run({ sock, msg, args, prefix }) {
    if (msg.isGroup) {
      await reply(
        sock,
        msg,
        `🔐 Configure reminders in my DM: *${prefix}tourreminder CODE 18:00*`,
      );
      return;
    }

    try {
      const tournament = tournamentRepo.get(args[0] ?? '');
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      if (!(await canManageTournament(sock, msg, tournament))) {
        await reply(sock, msg, '🚫 Only the organizer or a group admin can change reminders.');
        return;
      }
      const option = args[1]?.toLowerCase();
      if (!option) {
        await reply(
          sock,
          msg,
          tournament.reminderEnabled !== false
            ? `⏰ *${tournament.code}* reminder: daily at *${tournament.reminderTime || '18:00'} WAT*. It stops automatically after registration closes or fills.`
            : `🔕 *${tournament.code}* daily reminder is off.`,
        );
        return;
      }
      if (option === 'off') {
        tournamentRepo.configureReminder(tournament.code, false);
        await flushTournament();
        await reply(sock, msg, `✅ Daily reminder disabled for *${tournament.code}*.`);
        return;
      }
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(option)) {
        await reply(
          sock,
          msg,
          `ℹ️ Use 24-hour Lagos time, e.g. *${prefix}tourreminder ${tournament.code} 18:00*, or use *off*.`,
        );
        return;
      }
      tournamentRepo.configureReminder(tournament.code, true, option);
      await flushTournament();
      await reply(
        sock,
        msg,
        `✅ *${tournament.code}* will post one short hidden-tag reminder daily at *${option} WAT*.`,
      );
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourreminder;
