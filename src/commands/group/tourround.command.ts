import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  canManageTournament,
  flushTournament,
  parseRoundResults,
  tournamentErrorMessage,
  validateRound,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourround: Command = {
  name: 'tourround',
  category: 'group',
  description: 'Privately record one round using UID,kills,placement rows.',
  usage: 'tourround <code> <round> | UID,kills,place; UID,kills,place',
  async run({ sock, msg, text, prefix }) {
    if (msg.isGroup) {
      await reply(
        sock,
        msg,
        `🔐 Record results privately to keep the group clean. DM me:\n*${prefix}tourround CODE 1 | UID,kills,place; UID,kills,place*`,
      );
      return;
    }

    const separator = text.indexOf('|');
    const head = separator >= 0 ? text.slice(0, separator).trim() : '';
    const rows = separator >= 0 ? text.slice(separator + 1).trim() : '';
    const [code = '', roundRaw = ''] = head.split(/\s+/);
    const round = Number(roundRaw);
    if (!code || !rows) {
      await reply(
        sock,
        msg,
        `ℹ️ Example: *${prefix}tourround VENOM40 1 | 123456789,4,1; 987654321,2,2*`,
      );
      return;
    }

    try {
      validateRound(round);
      const tournament = tournamentRepo.get(code);
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      if (!(await canManageTournament(sock, msg, tournament))) {
        await reply(sock, msg, '🚫 Only the organizer or a group admin can record results.');
        return;
      }
      const results = parseRoundResults(rows);
      tournamentRepo.recordRound(tournament.code, round, results);
      await flushTournament();
      await reply(
        sock,
        msg,
        `✅ Round ${round} saved for ${results.length} players. Nothing was posted automatically. When verified, run *${prefix}tourstandings ${tournament.code}* to publish one standings update.`,
      );
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourround;
