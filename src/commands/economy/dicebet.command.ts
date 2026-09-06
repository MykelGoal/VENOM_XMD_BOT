import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';

/** Bet on a dice roll (1-6). Correct guess pays 5x. */
const dicebet: Command = {
  name: 'dicebet',
  aliases: ['betdice'],
  category: 'economy',
  description: 'Bet coins on a dice roll (1-6). Correct guess pays 5x!',
  usage: 'dicebet <1-6> <amount>',
  async run({ sock, msg, args }) {
    const guess = parseInt(args[0], 10);
    const amount = parseInt(args[1], 10);
    if (isNaN(guess) || guess < 1 || guess > 6 || isNaN(amount) || amount <= 0) {
      await reply(sock, msg, 'ℹ️ Usage: *dicebet <1-6> <amount>*');
      return;
    }
    const u = economyRepo.get(msg.senderNumber);
    if (amount > u.wallet) {
      await reply(sock, msg, "❌ You don't have that much.");
      return;
    }
    const roll = Math.floor(Math.random() * 6) + 1;
    if (roll === guess) {
      const won = amount * 5;
      u.wallet += won - amount;
      economyRepo.save(u);
      await reply(sock, msg, `🎲 Rolled *${roll}* — you nailed it!\n🎉 Won ${CURRENCY} ${won.toLocaleString()} (5x)!`);
    } else {
      u.wallet -= amount;
      economyRepo.save(u);
      await reply(sock, msg, `🎲 Rolled *${roll}* — you guessed ${guess}.\n💸 Lost ${CURRENCY} ${amount.toLocaleString()}.`);
    }
  },
};

export default dicebet;
