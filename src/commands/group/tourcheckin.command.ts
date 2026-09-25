import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  canManageTournament,
  flushTournament,
  sendPlayerDMs,
  tournamentErrorMessage,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourcheckin: Command = {
  name: 'tourcheckin',
  aliases: ['tcheckin'],
  category: 'group',
  description: 'Open tournament check-in or check in privately as a player.',
  usage: 'tourcheckin <code> OR tourcheckin open <code>',
  async run({ sock, msg, args, prefix }) {
    const opening = args[0]?.toLowerCase() === 'open';
    const code = opening ? args[1] : args[0];
    if (!code) {
      await reply(
        sock,
        msg,
        `ℹ️ Player: *${prefix}tourcheckin CODE*\nOrganizer: *${prefix}tourcheckin open CODE*`,
      );
      return;
    }

    if (opening) {
      if (msg.isGroup) {
        await reply(sock, msg, `🔐 Open check-in privately: DM me *${prefix}tourcheckin open ${code}*`);
        return;
      }
      try {
        const tournament = tournamentRepo.get(code);
        if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
        if (!(await canManageTournament(sock, msg, tournament))) {
          await reply(sock, msg, '🚫 Only the organizer or a group admin can open check-in.');
          return;
        }
        if (tournament.checkinOpenedAt) {
          await reply(sock, msg, 'ℹ️ Check-in is already open; players will not be messaged twice.');
          return;
        }
        tournamentRepo.openCheckin(tournament.code);
        await flushTournament();
        const players = tournamentRepo.approvedPlayers(tournament.code);
        await sock.sendMessage(tournament.groupJid, {
          text:
            `🎮✅ *${tournament.code} CHECK-IN IS OPEN*\n` +
            `Approved players: DM the bot with *${prefix}tourcheckin ${tournament.code}*.\n` +
            '_Room details will be sent privately after check-in._',
        });
        const delivery = await sendPlayerDMs(
          sock,
          players,
          () =>
            `🎮 *${tournament.code} check-in is open!*\nReply here with *${prefix}tourcheckin ${tournament.code}* to confirm that you are ready.`,
        );
        await reply(
          sock,
          msg,
          `✅ Check-in opened. Private notice delivered to ${delivery.sent}/${players.length} approved players${delivery.failed ? ` (${delivery.failed} failed)` : ''}.`,
        );
      } catch (err) {
        await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
      }
      return;
    }

    if (msg.isGroup) {
      await reply(sock, msg, `🔐 Check in privately by sending me: *${prefix}tourcheckin ${code}*`);
      return;
    }
    try {
      const result = tournamentRepo.checkInPlayer(code, msg.senderNumber);
      await flushTournament();
      await reply(
        sock,
        msg,
        `${result.changed ? '✅ You are checked in' : 'ℹ️ You were already checked in'} for *${result.tournament.code}*. Keep this chat open; your room ID and password will arrive here privately.`,
      );
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourcheckin;
