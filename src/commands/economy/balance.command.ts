import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';
import { jidToNumber } from '../../utils/helpers';

const balance: Command = {
  name: 'balance',
  aliases: ['bal', 'wallet', 'money'],
  category: 'economy',
  description: 'Check your (or a mentioned user\'s) balance.',
  usage: 'balance [@user]',
  async run({ sock, msg }) {
    const number = msg.mentions[0]
      ? jidToNumber(msg.mentions[0])
      : msg.senderNumber;
    const u = economyRepo.get(number);
    const net = u.wallet + u.bank - u.loan;
    const lines = [
      `💰 *Balance* ${msg.mentions[0] ? `for @${number}` : ''}`,
      '',
      `👛 Wallet: ${CURRENCY} ${u.wallet.toLocaleString()}`,
      `🏦 Bank: ${CURRENCY} ${u.bank.toLocaleString()} / ${u.bankCap.toLocaleString()}`,
      u.loan > 0 ? `📉 Loan: ${CURRENCY} ${u.loan.toLocaleString()}` : '',
      `💎 Net worth: ${CURRENCY} ${net.toLocaleString()}`,
    ].filter(Boolean);
    await sock.sendMessage(
      msg.chat,
      {
        text: lines.join('\n'),
        mentions: msg.mentions[0] ? [msg.mentions[0]] : undefined,
      },
      { quoted: msg.raw },
    );
  },
};

export default balance;
