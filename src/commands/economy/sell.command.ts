import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';
import { findItem } from '../_shared/shop';

const sell: Command = {
  name: 'sell',
  category: 'economy',
  description: 'Sell an item from your inventory.',
  usage: 'sell <item id> [qty]',
  async run({ sock, msg, args }) {
    const item = findItem(args[0] ?? '');
    if (!item) {
      await reply(sock, msg, 'ℹ️ Usage: *sell <item id>* — see *.inventory*');
      return;
    }
    const qty = Math.max(1, parseInt(args[1], 10) || 1);
    const ok = economyRepo.removeItem(msg.senderNumber, item.id, qty);
    if (!ok) {
      await reply(sock, msg, `❌ You don't have ${qty}x ${item.name}.`);
      return;
    }
    const gain = item.sell * qty;
    economyRepo.addWallet(msg.senderNumber, gain);
    await reply(sock, msg, `💵 Sold ${qty}x ${item.emoji} ${item.name} for ${CURRENCY} ${gain.toLocaleString()}.`);
  },
};

export default sell;
