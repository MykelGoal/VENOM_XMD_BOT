import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  canManageTournament,
  flushTournament,
  postRegistrationMilestone,
  sendPlayerDM,
  tournamentErrorMessage,
  tournamentStorageReady,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourapprove: Command = {
  name: 'tourapprove',
  category: 'group',
  description: 'Privately approve a verified tournament payment.',
  usage: 'tourapprove <code> <Free Fire UID or phone>',
  async run({ sock, msg, args, prefix }) {
    if (msg.isGroup) {
      await reply(
        sock,
        msg,
        `🔐 Approvals stay private to avoid 40 group messages. DM me: *${prefix}tourapprove CODE UID*`,
      );
      return;
    }
    if (!tournamentStorageReady()) {
      await reply(sock, msg, '⚠️ Persistent storage is offline; approval was not attempted.');
      return;
    }

    const [code = '', identity = ''] = args;
    try {
      const tournament = tournamentRepo.get(code);
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      if (!(await canManageTournament(sock, msg, tournament))) {
        await reply(sock, msg, '🚫 Only the tournament organizer or a group admin can approve payments.');
        return;
      }
      if (!identity) {
        await reply(sock, msg, `ℹ️ Usage: *${prefix}tourapprove ${tournament.code} FreeFireUID*`);
        return;
      }

      const result = tournamentRepo.approvePlayer(
        tournament.code,
        identity,
        msg.senderNumber,
      );
      await flushTournament();
      if (result.changed) {
        await sendPlayerDM(
          sock,
          result.player,
          `✅🏆 *Payment verified — ${tournament.code}*\nYour tournament slot is now confirmed. Keep this chat open for check-in and private room details.`,
        );
      }

      let milestoneWarning = '';
      try {
        await postRegistrationMilestone(sock, result.tournament);
      } catch {
        milestoneWarning = '\n⚠️ The group milestone update could not be posted.';
      }
      const approved = tournamentRepo.approvedPlayers(tournament.code).length;
      await reply(
        sock,
        msg,
        `${result.changed ? '✅ Approved' : 'ℹ️ Already approved'}: *${result.player.nickname}* (${approved}/${tournament.maxPlayers}).${milestoneWarning}`,
      );
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourapprove;
