import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  canManageTournament,
  finalResultsMessage,
  flushTournament,
  sendPlayerDMs,
  tournamentErrorMessage,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourfinish: Command = {
  name: 'tourfinish',
  category: 'group',
  description: 'Publish the final top three and close the tournament.',
  usage: 'tourfinish <code>',
  async run({ sock, msg, args }) {
    try {
      const tournament = tournamentRepo.get(args[0] ?? '');
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      if (!(await canManageTournament(sock, msg, tournament))) {
        await reply(sock, msg, '🚫 Only the organizer or a group admin can finish the tournament.');
        return;
      }
      if (tournament.finalPostedAt || tournament.status === 'finished') {
        await reply(sock, msg, 'ℹ️ Final results were already posted.');
        return;
      }
      if (![1, 2, 3].every((round) => tournament.completedRounds.includes(round))) {
        await reply(sock, msg, 'ℹ️ Record rounds 1, 2 and 3 before publishing final results.');
        return;
      }
      const ranking = tournamentRepo.ranking(tournament.code);
      if (ranking.length < 3) {
        await reply(sock, msg, 'ℹ️ At least three approved players are required for final results.');
        return;
      }

      const final = finalResultsMessage(tournament, ranking);
      await sock.sendMessage(tournament.groupJid, {
        text: final.text,
        mentions: final.mentions,
      });
      tournamentRepo.markFinished(tournament.code);
      await flushTournament();

      const prizes = [
        tournament.prizes.first,
        tournament.prizes.second,
        tournament.prizes.third,
      ];
      await sendPlayerDMs(
        sock,
        ranking.slice(0, 3).map((entry) => entry.player),
        (player) => {
          const place = ranking.findIndex((entry) => entry.player === player);
          return `🏆 Congratulations! You placed #${place + 1} in *${tournament.code}* and won *₦${prizes[place].toLocaleString('en-NG')}*. Contact the organizer privately to verify payout details.`;
        },
      );
      if (!msg.isGroup || msg.chat !== tournament.groupJid) {
        await reply(sock, msg, '✅ Final results posted and the tournament was closed safely.');
      }
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourfinish;
