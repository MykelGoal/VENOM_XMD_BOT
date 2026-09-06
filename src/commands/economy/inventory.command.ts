import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo } from '../../database/repositories/economy.repo';
import { SHOP_ITEMS } from '../_shared/shop';

const inventory: Command = {
  name: 'inventory',
  aliases: ['inv', 'bag'],
  category: 'economy',
  description: 'View your inventory.',
  usage: 'inventory',
  async run({ sock, msg }) {
    const u = economyRepo.get(msg.senderNumber);
    const entries = Object.entries(u.inventory);
    if (entries.length === 0) {
      await reply(sock, msg, '🎒 Your inventory is empty. Buy items with *.shop*.');
      return;
    }
    const lines = ['🎒 *Your Inventory*', ''];
    for (const [id, qty] of entries) {
      const item = SHOP_ITEMS.find((i) => i.id === id);
      lines.push(`${item?.emoji ?? '📦'} ${item?.name ?? id} ×${qty}`);
    }
    await reply(sock, msg, lines.join('\n'));
  },
};

export default inventory;
