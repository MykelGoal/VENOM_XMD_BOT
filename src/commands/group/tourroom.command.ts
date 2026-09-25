import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  canManageTournament,
  flushTournament,
  sendPlayerDMs,
  tournamentErrorMessage,
  validateRound,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourroom: Command = {
  name: 'tourroom',
  category: 'group',
  description: 'Privately send a Free Fire room ID/password to checked-in players.',
  usage: 'tourroom <code> <round> | <room ID> | <password> [| resend]',
  async run({ sock, msg, text, prefix }) {
    if (msg.isGroup) {
      await sock.sendMessage(msg.chat, { delete: msg.raw.key }).catch(() => {});
      await reply(
        sock,
        msg,
        `🔐 Room credentials were not accepted here. DM me privately: *${prefix}tourroom CODE 1 | ROOM_ID | PASSWORD*`,
      );
      return;
    }

    const [head = '', roomId = '', password = '', option = ''] = text
      .split('|')
      .map((part) => part.trim());
    const [code = '', roundRaw = ''] = head.split(/\s+/);
    const round = Number(roundRaw);
    if (!code || !roomId || !password) {
      await reply(
        sock,
        msg,
        `ℹ️ Usage: *${prefix}tourroom VENOM40 1 | 123456 | secret*`,
      );
      return;
    }

    try {
      validateRound(round);
      const tournament = tournamentRepo.get(code);
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      if (!(await canManageTournament(sock, msg, tournament))) {
        await reply(sock, msg, '🚫 Only the organizer or a group admin can send room details.');
        return;
      }
      const resend = option.toLowerCase() === 'resend';
      if (tournament.roomSentRounds.includes(round) && !resend) {
        await reply(
          sock,
          msg,
          `ℹ️ Round ${round} credentials were already sent. Add *| resend* only if you intentionally need to send them again.`,
        );
        return;
      }
      const players = tournamentRepo
        .approvedPlayers(tournament.code)
        .filter((player) => Boolean(player.checkedInAt));
      if (!players.length) {
        await reply(sock, msg, '❌ No approved players have checked in yet.');
        return;
      }

      tournamentRepo.markRoomSent(tournament.code, round);
      await flushTournament();
      const delivery = await sendPlayerDMs(
        sock,
        players,
        (player) =>
          [
            `🎮🔐 *${tournament.code} — ROUND ${round}*`,
            `Player: ${player.nickname}`,
            `Room ID: *${roomId}*`,
            `Password: *${password}*`,
            '',
            'Do not share these details. Join immediately using your registered Free Fire account.',
          ].join('\n'),
      );
      await sock.sendMessage(tournament.groupJid, {
        text: `🎮 *${tournament.code} Round ${round}* room details were sent privately to ${delivery.sent} checked-in players.`,
      });
      await reply(
        sock,
        msg,
        `✅ Private delivery complete: ${delivery.sent} sent, ${delivery.failed} failed. No room credentials were posted in the group.`,
      );
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourroom;
