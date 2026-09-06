import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { CURRENCY } from '../../database/repositories/economy.repo';
import { SHOP_ITEMS } from '../_shared/shop';

const shop: Command = {
  name: 'shop',
  aliases: ['store'],
  category: 'economy',
  description: 'View items available in the shop.',
  usage: 'shop',
  async run({ sock, msg }) {
    const lines = ['🛒 *SHOP*', ''];
    for (const i of SHOP_ITEMS) {
      lines.push(
        `${i.emoji} *${i.name}* — ${CURRENCY} ${i.price.toLocaleString()}`,
        `   _${i.description}_`,
        `   id: \`${i.id}\``,
        '',
      );
    }
    lines.push('Buy with *.buy <id>* • Sell with *.sell <id>*');
    await reply(sock, msg, lines.join('\n'));
  },
};

export default shop;
