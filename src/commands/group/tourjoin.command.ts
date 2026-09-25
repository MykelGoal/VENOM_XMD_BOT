import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  flushTournament,
  resolveTournamentGroupJid,
  tournamentErrorMessage,
  tournamentStorageReady,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';
import { jidToNumber } from '../../utils/helpers';

const tourjoin: Command = {
  name: 'tourjoin',
  aliases: ['jointour'],
  category: 'group',
  description: 'Register privately for a Free Fire tournament.',
  usage: 'tourjoin <code> <nickname> | <Free Fire UID>',
  async run({ sock, msg, text, prefix }) {
    if (msg.isGroup) {
      const botNumber = jidToNumber(sock.user?.id ?? '');
      await reply(
        sock,
        msg,
        `🔐 Registration is private to prevent group spam. DM the bot${
          botNumber ? ` at https://wa.me/${botNumber}` : ''
        } with:\n*${prefix}tourjoin CODE Nickname | FreeFireUID*`,
      );
      return;
    }
    if (!tournamentStorageReady()) {
      await reply(sock, msg, '⚠️ Registration is temporarily unavailable because persistent storage is offline.');
      return;
    }

    const firstSpace = text.indexOf(' ');
    const code = firstSpace > 0 ? text.slice(0, firstSpace).trim() : '';
    const registration = firstSpace > 0 ? text.slice(firstSpace + 1).trim() : '';
    const [nickname = '', freeFireUid = ''] = registration
      .split('|')
      .map((part) => part.trim());
    if (
      !code ||
      nickname.length < 2 ||
      nickname.length > 30 ||
      !/^\d{6,15}$/.test(freeFireUid)
    ) {
      await reply(
        sock,
        msg,
        `ℹ️ Usage: *${prefix}tourjoin VENOM40 YourNickname | 1234567890*`,
      );
      return;
    }

    try {
      const tournament = tournamentRepo.get(code);
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      const groupJid = await resolveTournamentGroupJid(
        sock,
        tournament,
        msg.senderNumber,
      );
      tournamentRepo.addPlayer(code, {
        number: msg.senderNumber,
        jid: msg.sender,
        groupJid,
        nickname,
        freeFireUid,
      });
      await flushTournament();
      await reply(
        sock,
        msg,
        [
          `✅ *Registration received for ${tournament.code}*`,
          `🎮 Nickname: ${nickname}`,
          `🆔 UID: ${freeFireUid}`,
          '',
          '⏳ Status: *Pending payment verification*',
          '',
          `💳 *Pay ₦${tournament.entryFeeNaira.toLocaleString('en-NG')} to:*`,
          tournament.paymentInstructions,
          `🧾 Transfer reference/narration: *${tournament.code}-${freeFireUid.slice(-4)}*`,
          '',
          `After payment, send the receipt screenshot/document here with *${prefix}tourproof ${tournament.code}* as its caption. Your slot becomes official only after the organizer verifies the actual bank credit.`,
        ].join('\n'),
      );
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourjoin;
