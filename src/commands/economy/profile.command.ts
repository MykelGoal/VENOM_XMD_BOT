import type { Command } from '../../types/command.type';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';
import { jidToNumber } from '../../utils/helpers';

const profile: Command = {
  name: 'profile',
  aliases: ['eco', 'economy'],
  category: 'economy',
  description: 'Show your full economy profile.',
  usage: 'profile [@user]',
  async run({ sock, msg }) {
    const number = msg.mentions[0]
      ? jidToNumber(msg.mentions[0])
      : msg.senderNumber;
    const u = economyRepo.get(number);
    const net = u.wallet + u.bank - u.loan;
    const items = Object.keys(u.inventory).length;
    const text = [
      `👤 *Profile:* @${number}`,
      '',
      `👛 Wallet: ${CURRENCY} ${u.wallet.toLocaleString()}`,
      `🏦 Bank: ${CURRENCY} ${u.bank.toLocaleString()} / ${u.bankCap.toLocaleString()}`,
      u.loan > 0 ? `📉 Loan: ${CURRENCY} ${u.loan.toLocaleString()}` : '',
      `💎 Net worth: ${CURRENCY} ${net.toLocaleString()}`,
      `🔥 Daily streak: ${u.streak}`,
      `🎒 Items: ${items}`,
    ].filter(Boolean);
    await sock.sendMessage(
      msg.chat,
      { text: text.join('\n'), mentions: [`${number}@s.whatsapp.net`] },
      { quoted: msg.raw },
    );
  },
};

export default profile;
