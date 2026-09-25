import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  flushTournament,
  tournamentErrorMessage,
  tournamentStorageReady,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';
import { numberToJid } from '../../utils/helpers';

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

      const organizerJid =
        tournament.createdByDmJid || numberToJid(tournament.createdByNumber);
      await sock.sendMessage(organizerJid, {
        text: [
          `🧾 *NEW PAYMENT PROOF — ${tournament.code}*`,
          `Player: ${player.nickname}`,
          `Free Fire UID: ${player.freeFireUid}`,
          `WhatsApp: ${player.number}`,
          `Expected amount: ₦${tournament.entryFeeNaira.toLocaleString('en-NG')}`,
          `Expected reference: ${tournament.code}-${player.freeFireUid.slice(-4)}`,
          '',
          '⚠️ Verify the credit inside your bank app; do not trust the screenshot alone.',
          `Approve: *${prefix}tourapprove ${tournament.code} ${player.freeFireUid}*`,
          `Reject: *${prefix}tourreject ${tournament.code} ${player.freeFireUid}*`,
        ].join('\n'),
      });
      await sock.relayMessage(organizerJid, msg.raw.message!, {
        messageId: undefined as never,
      });
      tournamentRepo.markPaymentProof(tournament.code, msg.senderNumber);
      await flushTournament();
      await reply(
        sock,
        msg,
        '✅ Receipt sent privately to the organizer. Your status remains pending until the actual bank credit is verified.',
      );
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourproof;
