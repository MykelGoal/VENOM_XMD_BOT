import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import { getGroupMetadata } from '../../services/group.service';
import {
  flushTournament,
  getTournamentPaymentAccount,
  paymentInstructions,
  sendTournamentAnnouncement,
  tournamentErrorMessage,
  tournamentStorageReady,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';
import { numberToJid } from '../../utils/helpers';

const tourcreate: Command = {
  name: 'tourcreate',
  aliases: ['createtour'],
  category: 'group',
  description: 'Create and announce a persistent Free Fire tournament.',
  usage: 'tourcreate <code> | <date/time>',
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

    const [rawCode = '', eventDate = ''] = text
      .split('|')
      .map((part) => part.trim());
    if (!rawCode || !eventDate) {
      await reply(
        sock,
        msg,
        'ℹ️ Usage: *tourcreate VENOM40 | 5 October, 7 PM*\nSet the payment account privately first with *.touraccount*.',
      );
      return;
    }
    const configuredAccount = getTournamentPaymentAccount();
    const payment = configuredAccount
      ? paymentInstructions(configuredAccount)
      : '';
    if (!payment) {
      await reply(
        sock,
        msg,
        '🚫 No tournament payment account is configured. DM the bot with *.touraccount BANK | ACCOUNT_NUMBER | ACCOUNT_NAME* first.',
      );
      return;
    }

    try {
      const metadata = await getGroupMetadata(sock, msg.chat);
      const participantPn = (
        msg.raw.key as typeof msg.raw.key & { participantPn?: string }
      ).participantPn;
      const tournament = tournamentRepo.create({
        code: rawCode,
        groupJid: msg.chat,
        groupName: metadata.subject,
        eventDate,
        paymentInstructions: payment,
        createdByJid: msg.sender,
        createdByDmJid: participantPn ?? numberToJid(msg.senderNumber),
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
          `✅ Tournament *${tournament.code}* created. Everyone received one hidden-tag announcement; a short reminder will run daily at 6:00 PM WAT until registration closes. Registrations and payments stay private.`,
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
