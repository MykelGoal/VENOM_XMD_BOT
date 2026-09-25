import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  canManageTournament,
  flushTournament,
  sendTournamentAnnouncement,
  tournamentErrorMessage,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourannounce: Command = {
  name: 'tourannounce',
  category: 'group',
  description: 'Retry the one-time tournament launch announcement.',
  usage: 'tourannounce <code>',
  async run({ sock, msg, args }) {
    try {
      const tournament = tournamentRepo.get(args[0] ?? '');
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      if (!(await canManageTournament(sock, msg, tournament))) {
        await reply(sock, msg, '🚫 Only the tournament organizer or a group admin can do that.');
        return;
      }
      if (!msg.isGroup || msg.chat !== tournament.groupJid) {
        await reply(sock, msg, 'ℹ️ Run this command inside the tournament group.');
        return;
      }
      if (tournament.announcementSentAt) {
        await reply(sock, msg, '✅ The launch announcement was already posted. It will not tag everyone twice.');
        return;
      }

      await sendTournamentAnnouncement(sock, tournament);
      tournamentRepo.markAnnouncementSent(tournament.code);
      await flushTournament();
      await reply(sock, msg, '✅ Tournament announcement posted and everyone tagged once.');
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourannounce;
