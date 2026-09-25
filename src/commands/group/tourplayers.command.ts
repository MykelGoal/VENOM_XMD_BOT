import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  canManageTournament,
  tournamentErrorMessage,
  tournamentPlayersText,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourplayers: Command = {
  name: 'tourplayers',
  category: 'group',
  description: 'Privately list tournament registrations and payment states.',
  usage: 'tourplayers <code>',
  async run({ sock, msg, args, prefix }) {
    if (msg.isGroup) {
      await reply(sock, msg, `🔐 The registration list is private. DM me: *${prefix}tourplayers CODE*`);
      return;
    }
    try {
      const tournament = tournamentRepo.get(args[0] ?? '');
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      if (!(await canManageTournament(sock, msg, tournament))) {
        await reply(sock, msg, '🚫 Only the organizer or a group admin can view that list.');
        return;
      }
      await reply(sock, msg, tournamentPlayersText(tournament));
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourplayers;
