import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  canManageTournament,
  flushTournament,
  sendPlayerDM,
  tournamentErrorMessage,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourreject: Command = {
  name: 'tourreject',
  category: 'group',
  description: 'Reject an unverified tournament registration privately.',
  usage: 'tourreject <code> <Free Fire UID or phone>',
  async run({ sock, msg, args, prefix }) {
    if (msg.isGroup) {
      await reply(sock, msg, `🔐 DM me instead: *${prefix}tourreject CODE UID*`);
      return;
    }

    const [code = '', identity = ''] = args;
    try {
      const tournament = tournamentRepo.get(code);
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      if (!(await canManageTournament(sock, msg, tournament))) {
        await reply(sock, msg, '🚫 Only the tournament organizer or a group admin can reject registrations.');
        return;
      }
      if (!identity) {
        await reply(sock, msg, `ℹ️ Usage: *${prefix}tourreject ${tournament.code} FreeFireUID*`);
        return;
      }
      const { player } = tournamentRepo.rejectPlayer(tournament.code, identity);
      await flushTournament();
      await sendPlayerDM(
        sock,
        player,
        `❌ *${tournament.code} registration not verified*\nContact the organizer privately if you believe this is a mistake.`,
      );
      await reply(sock, msg, `✅ Registration rejected for *${player.nickname}*.`);
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourreject;
