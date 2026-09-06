import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import {
  economyRepo,
  cooldownLeft,
  fmtDuration,
  CURRENCY,
} from '../../database/repositories/economy.repo';
import type { EconomyModel } from '../../database/models/economy.model';

interface GatherOptions {
  name: string;
  aliases?: string[];
  /** Which cooldown timestamp field to use. */
  field: keyof Pick<EconomyModel, 'lastFish' | 'lastMine' | 'lastHunt'>;
  cooldownMs: number;
  /** Item required in inventory (optional). */
  requiredItem?: string;
  requiredItemName?: string;
  min: number;
  max: number;
  successEmoji: string;
  /** Loot messages on success (use {amt}). */
  wins: string[];
  /** Message when you find nothing. */
  fail: string;
  failChance?: number;
}

export function makeGather(opts: GatherOptions): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: 'economy',
    description: `Go ${opts.name} to earn coins.`,
    usage: opts.name,
    async run({ sock, msg }) {
      const u = economyRepo.get(msg.senderNumber);

      if (opts.requiredItem && !u.inventory[opts.requiredItem]) {
        await reply(
          sock,
          msg,
          `❌ You need a ${opts.requiredItemName ?? opts.requiredItem} first. Buy one with *.buy ${opts.requiredItem}*.`,
        );
        return;
      }

      const left = cooldownLeft(u[opts.field] as number, opts.cooldownMs);
      if (left > 0) {
        await reply(sock, msg, `⏳ Rest a bit. Try again in ${fmtDuration(left)}.`);
        return;
      }
      u[opts.field] = Date.now();

      if (Math.random() < (opts.failChance ?? 0.15)) {
        economyRepo.save(u);
        await reply(sock, msg, opts.fail);
        return;
      }

      const amt = Math.floor(Math.random() * (opts.max - opts.min)) + opts.min;
      u.wallet += amt;
      economyRepo.save(u);
      const line = opts.wins[Math.floor(Math.random() * opts.wins.length)];
      await reply(
        sock,
        msg,
        `${opts.successEmoji} ${line.replace('{amt}', `${CURRENCY} ${amt.toLocaleString()}`)}`,
      );
    },
  };
}
