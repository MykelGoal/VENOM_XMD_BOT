import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  tournamentErrorMessage,
  tournamentStorageReady,
} from '../../services/tournament.service';
import { submitTournamentReceipt } from '../../services/tournament-natural.service';
import { reply } from '../../services/message.service';

const tourproof: Command = {
  name: 'tourproof',
  category: 'group',
  description: 'Privately forward a tournament payment receipt to the organizer.',
  usage: 'tourproof <code> (caption on receipt image/document)',
  async run({ sock, msg, args, prefix }) {
    if (msg.isGroup) {
      await reply(
        sock,
        msg,
        `🔐 Never post payment receipts in the group. Send the image/document to my DM with *${prefix}tourproof CODE* as its caption.`,
      );
      return;
    }
    if (!tournamentStorageReady()) {
      await reply(sock, msg, '⚠️ Receipt submission is temporarily unavailable because persistent storage is offline.');
      return;
    }
    if (!['imageMessage', 'documentMessage'].includes(msg.type)) {
      await reply(
        sock,
        msg,
        `ℹ️ Attach the receipt screenshot or PDF and use *${prefix}tourproof VENOM40* as its caption.`,
      );
      return;
    }

    try {
      const tournament = tournamentRepo.get(args[0] ?? '');
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      const player = tournamentRepo.findPlayer(
        tournament.code,
        msg.senderNumber,
      );
      if (!player) throw new Error('PLAYER_NOT_FOUND');
      if (player.paymentStatus !== 'pending') {
        throw new Error('PAYMENT_NOT_PENDING');
      }

      await submitTournamentReceipt(sock, msg, tournament, player);
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourproof;
