import { createCollection } from '../index';
import type { EconomyModel } from '../models/economy.model';
import { newEconomy } from '../models/economy.model';

const eco = createCollection<EconomyModel>('economy');

export const CURRENCY = '🪙';

export const economyRepo = {
  get(number: string): EconomyModel {
    const existing = eco.get(number);
    if (existing) {
      // Backfill any new fields on older records.
      return { ...newEconomy(number), ...existing };
    }
    const created = newEconomy(number);
    eco.set(number, created);
    return created;
  },

  save(model: EconomyModel): void {
    eco.set(model.number, model);
  },

  /** Add (or subtract) money from the wallet; never goes below 0. */
  addWallet(number: string, amount: number): EconomyModel {
    const u = this.get(number);
    u.wallet = Math.max(0, u.wallet + amount);
    this.save(u);
    return u;
  },

  addBank(number: string, amount: number): EconomyModel {
    const u = this.get(number);
    u.bank = Math.max(0, u.bank + amount);
    this.save(u);
    return u;
  },

  /** Total net worth = wallet + bank − loan. */
  netWorth(number: string): number {
    const u = this.get(number);
    return u.wallet + u.bank - u.loan;
  },

  transfer(from: string, to: string, amount: number): boolean {
    const a = this.get(from);
    if (a.wallet < amount || amount <= 0) return false;
    a.wallet -= amount;
    this.save(a);
    this.addWallet(to, amount);
    return true;
  },

  addItem(number: string, itemId: string, qty = 1): void {
    const u = this.get(number);
    u.inventory[itemId] = (u.inventory[itemId] ?? 0) + qty;
    this.save(u);
  },

  removeItem(number: string, itemId: string, qty = 1): boolean {
    const u = this.get(number);
    if ((u.inventory[itemId] ?? 0) < qty) return false;
    u.inventory[itemId] -= qty;
    if (u.inventory[itemId] <= 0) delete u.inventory[itemId];
    this.save(u);
    return true;
  },

  /** Top players by net worth. */
  top(limit = 10): EconomyModel[] {
    return eco
      .all()
      .sort(
        (a, b) => b.wallet + b.bank - b.loan - (a.wallet + a.bank - a.loan),
      )
      .slice(0, limit);
  },

  resetAll(): void {
    for (const u of eco.all()) eco.delete(u.number);
  },
};

/**
 * Cooldown helper. Returns remaining ms (0 if ready). Does NOT set the
 * timestamp — the caller sets it after a successful action.
 */
export function cooldownLeft(last: number, cooldownMs: number): number {
  const elapsed = Date.now() - last;
  return elapsed >= cooldownMs ? 0 : cooldownMs - elapsed;
}

/** Format ms as "1h 2m 3s" for cooldown messages. */
export function fmtDuration(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(' ');
}
