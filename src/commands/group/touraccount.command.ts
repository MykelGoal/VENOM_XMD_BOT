import type { Command } from '../../types/command.type';
import {
  clearTournamentPaymentAccount,
  flushTournament,
  getTournamentPaymentAccount,
  setTournamentPaymentAccount,
  tournamentStorageReady,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

function masked(number: string): string {
  return `${'*'.repeat(Math.max(4, number.length - 4))}${number.slice(-4)}`;
}

const touraccount: Command = {
  name: 'touraccount',
  aliases: ['tourpayment'],
  category: 'group',
  description: 'Privately configure the account sent to tournament registrants.',
  usage: 'touraccount <bank> | <account number> | <account name>',
  ownerOnly: true,
  async run({ sock, msg, text, prefix }) {
    if (msg.isGroup) {
      await reply(
        sock,
        msg,
        `🔐 For privacy, configure the payment account in my DM:\n*${prefix}touraccount BANK | ACCOUNT_NUMBER | ACCOUNT_NAME*`,
      );
      return;
    }
    if (!tournamentStorageReady()) {
      await reply(
        sock,
        msg,
        '🚫 MongoDB is not connected, so the payment account cannot be saved safely across redeploys.',
      );
      return;
    }

    if (!text.trim()) {
      const current = getTournamentPaymentAccount();
      await reply(
        sock,
        msg,
        current
          ? `💳 *Tournament payment account*\nBank: ${current.bank}\nAccount: ${masked(current.accountNumber)}\nName: ${current.accountName}`
          : `ℹ️ No account configured. Use:\n*${prefix}touraccount OPAY | 1234567890 | ACCOUNT NAME*`,
      );
      return;
    }

    if (text.trim().toLowerCase() === 'remove') {
      clearTournamentPaymentAccount();
      await flushTournament();
      await reply(sock, msg, '✅ Tournament payment account removed.');
      return;
    }

    const [bank = '', accountNumber = '', accountName = ''] = text
      .split('|')
      .map((part) => part.trim());
    if (
      bank.length < 2 ||
      bank.length > 50 ||
      !/^\d{8,15}$/.test(accountNumber) ||
      accountName.length < 2 ||
      accountName.length > 80
    ) {
      await reply(
        sock,
        msg,
        `ℹ️ Usage: *${prefix}touraccount OPAY | 1234567890 | ACCOUNT NAME*`,
      );
      return;
    }

    setTournamentPaymentAccount({ bank, accountNumber, accountName });
    await flushTournament();
    await reply(
      sock,
      msg,
      `✅ Tournament payment account saved safely.\nBank: ${bank}\nAccount: ${masked(accountNumber)}\nName: ${accountName}\n\nPlayers will receive the full details only after registering privately.`,
    );
  },
};

export default touraccount;
