import type { Command } from '../../types/command.type';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';
import { jidToNumber } from '../../utils/helpers';

const networth: Command = {
  name: 'networth',
  aliases: ['worth', 'nw'],
  category: 'economy',
  description: 'Show total net worth (wallet + bank − loan).',
  usage: 'networth [@user]',
  async run({ sock, msg }) {
    const number = msg.mentions[0]
      ? jidToNumber(msg.mentions[0])
      : msg.senderNumber;
    const net = economyRepo.netWorth(number);
    await sock.sendMessage(
      msg.chat,
      {
        text: `💎 Net worth of @${number}: ${CURRENCY} ${net.toLocaleString()}`,
        mentions: [msg.mentions[0] ?? `${number}@s.whatsapp.net`],
      },
      { quoted: msg.raw },
    );
  },
};

export default networth;
