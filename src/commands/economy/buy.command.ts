import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';
import { findItem } from '../_shared/shop';

const buy: Command = {
  name: 'buy',
  category: 'economy',
  description: 'Buy an item from the shop.',
  usage: 'buy <item id> [qty]',
  async run({ sock, msg, args }) {
    const item = findItem(args[0] ?? '');
    if (!item) {
      await reply(sock, msg, 'ℹ️ Usage: *buy <item id>* — see *.shop*');
      return;
    }
    const qty = Math.max(1, parseInt(args[1], 10) || 1);
    const cost = item.price * qty;
    const u = economyRepo.get(msg.senderNumber);
    if (u.wallet < cost) {
      await reply(sock, msg, `❌ You need ${CURRENCY} ${cost.toLocaleString()} but only have ${CURRENCY} ${u.wallet.toLocaleString()}.`);
      return;
    }
    u.wallet -= cost;
    economyRepo.save(u);
    economyRepo.addItem(msg.senderNumber, item.id, qty);
    await reply(sock, msg, `✅ Bought ${qty}x ${item.emoji} ${item.name} for ${CURRENCY} ${cost.toLocaleString()}.`);
  },
};

export default buy;
