import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';

const REELS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];

const slots: Command = {
  name: 'slots',
  aliases: ['slot'],
  category: 'economy',
  description: 'Play the slot machine.',
  usage: 'slots <amount>',
  async run({ sock, msg, args }) {
    const u = economyRepo.get(msg.senderNumber);
    const amount = parseInt(args[0], 10);
    if (isNaN(amount) || amount <= 0) {
      await reply(sock, msg, 'ℹ️ Usage: *slots <amount>*');
      return;
    }
    if (amount > u.wallet) {
      await reply(sock, msg, "❌ You don't have that much.");
      return;
    }
    const r = () => REELS[Math.floor(Math.random() * REELS.length)];
    const a = r(), b = r(), c = r();
    let mult = 0;
    if (a === b && b === c) mult = a === '💎' ? 10 : a === '7️⃣' ? 7 : 5;
    else if (a === b || b === c || a === c) mult = 2;

    const line = `🎰 [ ${a} | ${b} | ${c} ]`;
    if (mult > 0) {
      const won = amount * mult;
      u.wallet += won - amount;
      economyRepo.save(u);
      await reply(sock, msg, `${line}\n\n🎉 x${mult}! You won ${CURRENCY} ${won.toLocaleString()}!`);
    } else {
      u.wallet -= amount;
      economyRepo.save(u);
      await reply(sock, msg, `${line}\n\n💸 No match. You lost ${CURRENCY} ${amount.toLocaleString()}.`);
    }
  },
};

export default slots;
