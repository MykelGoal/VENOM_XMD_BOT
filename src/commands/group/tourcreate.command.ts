import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import { getGroupMetadata } from '../../services/group.service';
import {
  flushTournament,
  sendTournamentAnnouncement,
  tournamentErrorMessage,
  tournamentStorageReady,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourcreate: Command = {
  name: 'tourcreate',
  aliases: ['createtour'],
  category: 'group',
  description: 'Create and announce a persistent Free Fire tournament.',
  usage: 'tourcreate <code> | <date/time> | [payment instructions]',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, text }) {
    if (!tournamentStorageReady()) {
      await reply(
        sock,
        msg,
        '🚫 Tournament creation is blocked because MongoDB is not connected. This prevents registrations from disappearing after a redeploy. Set MONGO_URI and MONGO_DB=venomxmd first.',
      );
      return;
    }

    const [rawCode = '', eventDate = '', rawPayment = ''] = text
      .split('|')
      .map((part) => part.trim());
    if (!rawCode || !eventDate) {
      await reply(
        sock,
        msg,
        'ℹ️ Usage: *tourcreate VENOM40 | 5 October, 7 PM | Transfer to [your payment details]*',
      );
      return;
    }

    try {
      const metadata = await getGroupMetadata(sock, msg.chat);
      const tournament = tournamentRepo.create({
        code: rawCode,
        groupJid: msg.chat,
        groupName: metadata.subject,
        eventDate,
        paymentInstructions:
          rawPayment || 'Contact the tournament organizer privately for payment details.',
        createdByJid: msg.sender,
        createdByNumber: msg.senderNumber,
      });
      await flushTournament();

      try {
        await sendTournamentAnnouncement(sock, tournament);
        tournamentRepo.markAnnouncementSent(tournament.code);
        await flushTournament();
        await reply(
          sock,
          msg,
          `✅ Tournament *${tournament.code}* created and announced. Everyone was tagged once; registrations and payment confirmations will stay private.`,
        );
      } catch {
        await reply(
          sock,
          msg,
          `⚠️ Tournament *${tournament.code}* was saved safely, but the announcement could not be posted. Fix the connection and run *.tourannounce ${tournament.code}* once.`,
        );
      }
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourcreate;
