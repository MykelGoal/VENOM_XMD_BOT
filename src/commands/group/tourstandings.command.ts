import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  canManageTournament,
  flushTournament,
  standingsText,
  tournamentErrorMessage,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourstandings: Command = {
  name: 'tourstandings',
  aliases: ['tstandings'],
  category: 'group',
  description: 'Publish one compact top-10 standings update after a round.',
  usage: 'tourstandings <code>',
  async run({ sock, msg, args, prefix }) {
    try {
      const tournament = tournamentRepo.get(args[0] ?? '');
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      if (!(await canManageTournament(sock, msg, tournament))) {
        await reply(sock, msg, '🚫 Only the organizer or a group admin can publish standings.');
        return;
      }
      const round = Math.max(0, ...tournament.completedRounds);
      if (!round) {
        await reply(sock, msg, 'ℹ️ No round results have been recorded yet.');
        return;
      }
      if (tournament.standingsPostedRounds.includes(round)) {
        await reply(
          sock,
          msg,
          `ℹ️ Round ${round} standings were already posted. Correct the round with *${prefix}tourround* before posting again.`,
        );
        return;
      }
      const ranking = tournamentRepo.ranking(tournament.code);
      await sock.sendMessage(tournament.groupJid, {
        text: standingsText(tournament, ranking),
      });
      tournamentRepo.markStandingsPosted(tournament.code, round);
      await flushTournament();
      if (!msg.isGroup || msg.chat !== tournament.groupJid) {
        await reply(sock, msg, `✅ Round ${round} standings posted to ${tournament.groupName}.`);
      }
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourstandings;
