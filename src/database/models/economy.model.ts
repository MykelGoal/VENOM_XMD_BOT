export interface EconomyModel extends Record<string, unknown> {
  number: string;
  wallet: number;
  bank: number;
  bankCap: number;
  loan: number;
  /** ISO-ish timestamps (ms) for cooldown tracking. */
  lastDaily: number;
  lastWork: number;
  lastCrime: number;
  lastRob: number;
  lastFish: number;
  lastMine: number;
  lastHunt: number;
  lastBeg: number;
  /** Daily streak counter. */
  streak: number;
  /** Inventory: itemId -> quantity. */
  inventory: Record<string, number>;
  createdAt: number;
}

export function newEconomy(number: string): EconomyModel {
  return {
    number,
    wallet: 0,
    bank: 0,
    bankCap: 10000,
    loan: 0,
    lastDaily: 0,
    lastWork: 0,
    lastCrime: 0,
    lastRob: 0,
    lastFish: 0,
    lastMine: 0,
    lastHunt: 0,
    lastBeg: 0,
    streak: 0,
    inventory: {},
    createdAt: Date.now(),
  };
}
