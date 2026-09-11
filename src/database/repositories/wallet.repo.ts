import { createCollection } from '../index';

/**
 * VTU wallets & money ledger.
 *
 * REAL money moves through here, so the rules are strict:
 *   • Balances are stored in KOBO (integers) — floats never touch money.
 *   • Every movement writes an immutable ledger entry (append-only).
 *   • Credits are idempotent per reference: a replayed/duplicated payment
 *     notification can never double-credit a wallet.
 *   • Pending payments persist to disk — if the bot restarts mid-payment,
 *     the user's money is never lost.
 */

interface Wallet extends Record<string, unknown> {
  number: string;
  balanceKobo: number;
  updatedAt: number;
}

export type LedgerKind =
  | 'fund' // wallet top-up (payment link)
  | 'purchase' // data/airtime bought
  | 'refund' // failed delivery returned to wallet
  | 'direct' // direct buy-now payment (bypasses wallet debit)
  | 'adjustment'; // owner manual adjustment (future)

interface LedgerEntry extends Record<string, unknown> {
  id: string;
  number: string;
  kind: LedgerKind;
  amountKobo: number;
  balanceAfterKobo: number;
  ref: string;
  note: string;
  at: number;
}

export interface PendingPayment extends Record<string, unknown> {
  txRef: string;
  number: string;
  kind: 'fund' | 'data' | 'airtime';
  amountKobo: number;
  /** For data/airtime: what to deliver once payment lands. */
  bundleId?: number;
  bundleName?: string;
  network?: string;
  phone?: string;
  status: 'pending' | 'paid' | 'delivered' | 'failed' | 'refunded';
  createdAt: number;
  paidAt?: number;
}

const wallets = createCollection<Wallet>('wallets');
const ledger = createCollection<LedgerEntry>('walletledger');
const pending = createCollection<PendingPayment>('vtupending');

/** Ledger has a record for this reference already (idempotency guard). */
function refExists(ref: string, kinds: LedgerKind[]): boolean {
  return ledger
    .all()
    .some((e) => e.ref === ref && kinds.includes(e.kind));
}

export const walletRepo = {
  balance(number: string): number {
    return wallets.get(number)?.balanceKobo ?? 0;
  },

  updatedAt(number: string): number {
    return wallets.get(number)?.updatedAt ?? 0;
  },

  /** Credit a wallet. No-op (returns false) if this ref was already credited. */
  credit(number: string, amountKobo: number, kind: LedgerKind, ref: string, note = ''): boolean {
    if (amountKobo <= 0) return false;
    if (refExists(ref, [kind])) return false; // already processed — never double-credit
    const current = wallets.get(number);
    const next = (current?.balanceKobo ?? 0) + Math.round(amountKobo);
    wallets.set(number, { number, balanceKobo: next, updatedAt: Date.now() });
    ledger.set(`${ref}:${kind}`, {
      id: `${ref}:${kind}`,
      number,
      kind,
      amountKobo: Math.round(amountKobo),
      balanceAfterKobo: next,
      ref,
      note,
      at: Date.now(),
    });
    return true;
  },

  /** Debit a wallet. Throws Error('INSUFFICIENT') when the balance is too low. */
  debit(number: string, amountKobo: number, kind: LedgerKind, ref: string, note = ''): void {
    const current = wallets.get(number);
    const balance = current?.balanceKobo ?? 0;
    if (balance < amountKobo) throw new Error('INSUFFICIENT');
    const next = balance - Math.round(amountKobo);
    wallets.set(number, { number, balanceKobo: next, updatedAt: Date.now() });
    ledger.set(`${ref}:${kind}`, {
      id: `${ref}:${kind}`,
      number,
      kind,
      amountKobo: -Math.round(amountKobo),
      balanceAfterKobo: next,
      ref,
      note,
      at: Date.now(),
    });
  },

  /** Last N ledger entries for a user (newest first). */
  history(number: string, limit = 5): LedgerEntry[] {
    return ledger
      .all()
      .filter((e) => e.number === number)
      .sort((a, b) => b.at - a.at)
      .slice(0, limit);
  },

  /** Owner stats: total wallets, total ledger entries, system float. */
  stats(): { wallets: number; entries: number; totalBalanceKobo: number } {
    const all = wallets.all();
    return {
      wallets: all.length,
      entries: ledger.all().length,
      totalBalanceKobo: all.reduce((s, w) => s + w.balanceKobo, 0),
    };
  },

  /* ── Pending payments (persisted so restarts never lose money) ── */

  addPending(p: PendingPayment): void {
    pending.set(p.txRef, p);
  },

  getPending(txRef: string): PendingPayment | undefined {
    return pending.get(txRef);
  },

  /** Update a pending payment's status. */
  markPending(txRef: string, patch: Partial<PendingPayment>): void {
    const cur = pending.get(txRef);
    if (cur) pending.set(txRef, { ...cur, ...patch });
  },

  /** A user's still-unresolved payments (for .wallet re-checks + boot resume). */
  openPending(number: string): PendingPayment[] {
    return pending
      .all()
      .filter((p) => p.number === number && (p.status === 'pending' || p.status === 'paid'))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  /** All open pending payments younger than maxAgeMs (boot recovery). */
  recentPending(maxAgeMs: number, limit = 50): PendingPayment[] {
    const cutoff = Date.now() - maxAgeMs;
    return pending
      .all()
      .filter((p) => p.status === 'pending' && p.createdAt >= cutoff)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
};
