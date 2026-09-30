import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  flushTournament,
  sendPlayerDM,
  tournamentErrorMessage,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';
import { isOwner } from '../../middleware/permission';

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
      if (!isOwner(msg.senderNumber)) {
        await reply(sock, msg, '🚫 Only the configured owner can reject payment reviews.');
        return;
      }
      if (!identity) {
        await reply(sock, msg, `ℹ️ Usage: *${prefix}tourreject ${tournament.code} FreeFireUID*`);
        return;
      }
      const beforePlayer = tournamentRepo.findPlayer(tournament.code, identity);
      const before = beforePlayer
        ? {
            paymentStatus: beforePlayer.paymentStatus,
            approvedAt: beforePlayer.approvedAt,
            approvedBy: beforePlayer.approvedBy,
            rejectedAt: beforePlayer.rejectedAt,
            checkedInAt: beforePlayer.checkedInAt,
          }
        : undefined;
      const result = tournamentRepo.rejectPlayer(tournament.code, identity);
      try {
        await flushTournament();
      } catch {
        if (before) Object.assign(result.player, before);
        tournamentRepo.save(result.tournament);
        await flushTournament().catch(() => {});
        throw new Error('PERSISTENCE_FAILED');
      }
      const { player } = result;
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
