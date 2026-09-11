/**
 * VTU service — data bundles & airtime sales on Flutterwave.
 *
 * Two modes (auto-detected, keys NEVER live in the repo):
 *   • merchant — the deployer's OWN Flutterwave secret key (set with
 *     `.setkey flutterwave FLWSECK-...` or FLW_SECRET_KEY env). Their
 *     account, their float, their margin.
 *   • gateway — a central Venom Gateway server holds its own keys
 *     (VTU_GATEWAY_URL + VTU_GATEWAY_KEY). Deployers just point at it.
 *
 * Money rules (non-negotiable):
 *   • Balances/prices internally in KOBO (integers only).
 *   • Wallet credits are idempotent per tx_ref — replayed payment
 *     notifications can never double-credit.
 *   • Payments only count when Flutterwave's own verify endpoint says
 *     successful AND the amount matches. Never a user's word or screenshot.
 *   • Failed deliveries after payment auto-refund to the wallet.
 *   • Pending payments persist to disk — a restart never loses money.
 */
import axios from 'axios';
import { env } from '../config';
import { logger } from '../utils/logger';
import { settingsRepo } from '../database/repositories/settings.repo';
import { walletRepo } from '../database/repositories/wallet.repo';

// Re-exported so the VTU commands have a single service facade.
export { walletRepo };

const FLW = env.vtu.flwBaseUrl.replace(/\/$/, '');
const POLL_INTERVAL_MS = 15_000;
const POLL_ATTEMPTS = 40; // ~10 minutes of watching per payment

export type VtuMode = 'off' | 'merchant' | 'gateway';
export type Network = 'MTN' | 'Glo' | 'Airtel' | '9mobile';

export interface Bundle {
  /** Flutterwave bill-category id (stable across cache refreshes). */
  id: number;
  network: Network;
  /** Exact FLW bundle name — required as the `type` field on purchase. */
  flwName: string;
  /** Flutterwave's price (naira) — what the merchant wallet is charged. */
  amountNaira: number;
  /** Our selling price (kobo): FLW price + owner margin, rounded to ₦5. */
  priceKobo: number;
}

/* ────────────────────────── mode & keys ────────────────────────── */

export function flwSecretKey(): string {
  return (settingsRepo.get('vtu.flwsecret') || '').trim() || env.vtu.flwSecret.trim();
}

export function vtuMode(): VtuMode {
  if (flwSecretKey()) return 'merchant';
  if (env.vtu.gatewayUrl.trim()) return 'gateway';
  return 'off';
}

/**
 * Phase A: only *merchant* mode is implemented. Gateway mode (the Phase B
 * venom-gateway server) is detected but has no client yet — until it ships,
 * commands show a friendly reason instead of failing mid-request.
 * Returns null when VTU is usable.
 */
export function vtuUnavailable(): string | null {
  const mode = vtuMode();
  if (mode === 'merchant') return null;
  if (mode === 'gateway') {
    return '🚧 VTU *gateway mode* dey come (Phase B) — bot never support am yet.';
  }
  return '💳 VTU is not activated yet.\n_Owner: activate am with `.setkey flutterwave FLWSECK-…`_';
}

/** Effective margin % on data bundles (runtime setting over env default). */
export function marginPct(): number {
  const stored = Number(settingsRepo.get('vtu.margin'));
  return Number.isFinite(stored) && stored >= 0 && stored <= 100
    ? stored
    : env.vtu.marginPct;
}

export function setMarginPct(pct: number): void {
  settingsRepo.set('vtu.margin', String(pct));
}

/* ────────────────────────── helpers ────────────────────────── */

export function naira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

/** Normalize a Nigerian phone number to +234XXXXXXXXXX ('' when invalid). */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0') && p.length === 11) p = '234' + p.slice(1);
  if (!/^234\d{10}$/.test(p)) return '';
  return '+' + p;
}

function priceWithMargin(amountNaira: number): number {
  const marked = amountNaira * (1 + marginPct() / 100);
  return Math.ceil(marked / 5) * 5 * 100; // round UP to nearest ₦5, to kobo
}

/* ────────────────────────── Flutterwave API ────────────────────────── */

async function flw<T = any>(method: 'get' | 'post', path: string, body?: unknown): Promise<T> {
  const key = flwSecretKey();
  if (!key) throw new Error('NO_FLW_KEY');
  try {
    const { data } = await axios.request<T>({
      method,
      url: `${FLW}${path}`,
      data: body,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      timeout: 25_000,
    });
    return data;
  } catch (err) {
    const detail = axios.isAxiosError(err)
      ? `${err.response?.status ?? ''} ${
          (err.response?.data as any)?.message ?? err.message
        }`
      : String(err);
    throw new Error(`FLW ${path.split('?')[0]} failed: ${detail}`);
  }
}

/* ────────────────────────── bundles ────────────────────────── */

const BILLER_NETWORK: Record<string, Network> = {
  BIL108: 'MTN',
  BIL109: 'Glo',
  BIL110: 'Airtel',
  BIL111: '9mobile',
};

let bundleCache: { at: number; bundles: Bundle[] } | null = null;

export async function listBundles(network?: Network): Promise<Bundle[]> {
  if (!bundleCache || Date.now() - bundleCache.at > 60 * 60 * 1000) {
    const res = await flw('get', '/bill-categories?country=NG');
    const items: any[] = res?.data ?? [];
    bundleCache = {
      at: Date.now(),
      bundles: items
        .filter((i) => BILLER_NETWORK[i.biller_code] && !i.is_airtime && Number(i.amount) > 0)
        .map((i) => ({
          id: Number(i.id),
          network: BILLER_NETWORK[i.biller_code],
          flwName: String(i.name),
          amountNaira: Number(i.amount),
          priceKobo: priceWithMargin(Number(i.amount)),
        }))
        .sort((a, b) => a.amountNaira - b.amountNaira),
    };
  }
  const all = bundleCache.bundles;
  return network ? all.filter((b) => b.network === network) : all;
}

/** Resolve a bundle by network + display code (1-based index in price order). */
export async function bundleByCode(network: Network, code: number): Promise<Bundle | undefined> {
  const list = await listBundles(network);
  return list[code - 1];
}

/* ────────────────────────── payment links ────────────────────────── */

function txRef(kind: 'fund' | 'data' | 'air', number: string): string {
  return `VENOM-${kind.toUpperCase()}-${number}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

async function createCheckoutLink(opts: {
  txRef: string;
  amountNaira: number;
  title: string;
  description: string;
  number: string;
}): Promise<string> {
  const res = await flw('post', '/payments', {
    tx_ref: opts.txRef,
    amount: opts.amountNaira,
    currency: 'NGN',
    payment_options: 'card,banktransfer,ussd',
    customer: {
      email: `${opts.number}@venomxmd.user`,
      phonenumber: opts.number,
      name: 'Venom Wallet User',
    },
    customizations: { title: opts.title, description: opts.description },
  });
  const link = (res as any)?.data?.link;
  if (!link) throw new Error('no checkout link in response');
  return link;
}

/** `.fund <amount>` — create a wallet top-up link and start watching it. */
export async function initFund(number: string, amountNaira: number): Promise<{ txRef: string; link: string }> {
  const tx = txRef('fund', number);
  const link = await createCheckoutLink({
    txRef: tx,
    amountNaira,
    title: 'Venom Wallet Top-up',
    description: `Wallet funding for ${number}`,
    number,
  });
  walletRepo.addPending({
    txRef: tx,
    number,
    kind: 'fund',
    amountKobo: Math.round(amountNaira * 100),
    status: 'pending',
    createdAt: Date.now(),
  });
  startPolling(tx);
  return { txRef: tx, link };
}

/** Buy-now flow: payment link for the exact bundle price (no wallet needed). */
export async function initDirectBuy(
  number: string,
  bundle: Bundle,
  phone: string,
): Promise<{ txRef: string; link: string }> {
  const tx = txRef('data', number);
  const link = await createCheckoutLink({
    txRef: tx,
    amountNaira: bundle.priceKobo / 100,
    title: `${bundle.network} Data`,
    description: `${bundle.flwName} → ${phone}`,
    number,
  });
  walletRepo.addPending({
    txRef: tx,
    number,
    kind: 'data',
    amountKobo: bundle.priceKobo,
    bundleId: bundle.id,
    bundleName: bundle.flwName,
    network: bundle.network,
    phone,
    status: 'pending',
    createdAt: Date.now(),
  });
  startPolling(tx);
  return { txRef: tx, link };
}

/* ────────────────────────── fulfilment ────────────────────────── */

/** Deliver a data bundle / airtime through the Flutterwave Bills API. */
async function payBill(opts: {
  type: string; // bundle name, or 'AIRTIME'
  customer: string; // +234… phone
  amountNaira: number; // FLW price (NOT the user's margin price)
  reference: string;
}): Promise<void> {
  const res = await flw('post', '/bills', {
    country: 'NG',
    customer: opts.customer,
    amount: opts.amountNaira,
    recurrence: 'ONCE',
    type: opts.type,
    reference: opts.reference,
  });
  const status = (res as any)?.status ?? (res as any)?.data?.status;
  if (status !== 'success') throw new Error(`bill status: ${String(status)}`);
}

/** Buy with wallet balance (instant). Refunds the wallet if delivery fails. */
export async function purchaseWithWallet(
  number: string,
  bundle: Bundle,
  phone: string,
): Promise<{ ok: true; txRef: string } | { ok: false; error: string }> {
  const tx = txRef('data', number);
  try {
    walletRepo.debit(number, bundle.priceKobo, 'purchase', tx, `${bundle.network} ${bundle.flwName}`);
  } catch {
    return { ok: false, error: 'INSUFFICIENT' };
  }
  try {
    await payBill({ type: bundle.flwName, customer: phone, amountNaira: bundle.amountNaira, reference: tx });
    return { ok: true, txRef: tx };
  } catch (err) {
    // Delivery failed — money goes straight back to the wallet.
    walletRepo.credit(number, bundle.priceKobo, 'refund', `refund:${tx}`, 'delivery failed');
    logger.warn({ err }, 'VTU delivery failed, wallet refunded');
    return { ok: false, error: 'DELIVERY_FAILED' };
  }
}

/** Airtime: sold at face value (Flutterwave's ~2-3% commission covers fees). */
export async function buyAirtime(
  number: string,
  amountNaira: number,
  phone: string,
): Promise<{ ok: true; txRef: string } | { ok: false; error: string }> {
  if (amountNaira < 50 || amountNaira > 20000) return { ok: false, error: 'BAD_AMOUNT' };
  const tx = txRef('air', number);
  const kobo = Math.round(amountNaira * 100);
  try {
    walletRepo.debit(number, kobo, 'purchase', tx, `Airtime ${naira(kobo)} → ${phone}`);
  } catch {
    return { ok: false, error: 'INSUFFICIENT' };
  }
  try {
    await payBill({ type: 'AIRTIME', customer: phone, amountNaira, reference: tx });
    return { ok: true, txRef: tx };
  } catch (err) {
    walletRepo.credit(number, kobo, 'refund', `refund:${tx}`, 'airtime failed');
    logger.warn({ err }, 'airtime delivery failed, wallet refunded');
    return { ok: false, error: 'DELIVERY_FAILED' };
  }
}

/* ────────────────────────── payment watching ────────────────────────── */

type Notifier = (jid: string, text: string) => Promise<void> | void;
let notifier: Notifier | null = null;

/** Wired by connection.ts so the poller can message users proactively. */
export function registerVtuNotifier(fn: Notifier): void {
  notifier = fn;
}

async function notify(number: string, text: string): Promise<void> {
  try {
    await notifier?.(`${number}@s.whatsapp.net`, text);
  } catch {
    /* notification is best-effort */
  }
}

/** Ask Flutterwave directly whether a tx_ref completed (their word only). */
async function verifyPaid(txRef: string, expectedKobo: number): Promise<boolean> {
  const res = await flw('get', `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`);
  const d = (res as any)?.data;
  return (
    d?.status === 'successful' &&
    d?.currency === 'NGN' &&
    Number(d.amount) * 100 >= expectedKobo - 1 // amount tolerance: 1 kobo
  );
}

/** Verify + process one pending payment. Idempotent; returns true when resolved. */
export async function checkAndProcess(txRef: string): Promise<boolean> {
  const p = walletRepo.getPending(txRef);
  if (!p || p.status !== 'pending') return true;
  if (!(await verifyPaid(txRef, p.amountKobo))) return false;

  walletRepo.markPending(txRef, { status: 'paid', paidAt: Date.now() });

  if (p.kind === 'fund') {
    const credited = walletRepo.credit(p.number, p.amountKobo, 'fund', txRef, 'wallet top-up');
    const balance = walletRepo.balance(p.number);
    await notify(
      p.number,
      credited
        ? `💰 *Payment confirmed!*\n\n✅ ${naira(p.amountKobo)} don enter your wallet.\n💼 Balance: *${naira(balance)}*\n\n_Oya buy data: .data_`
        : `✅ Payment confirmed — your wallet balance na *${naira(balance)}*.`,
    );
    walletRepo.markPending(txRef, { status: 'delivered' });
    return true;
  }

  // Direct buy-now (data): deliver the bundle the tx_ref was created for.
  const bundles = await listBundles((p.network ?? 'MTN') as Network);
  const bundle = bundles.find((b) => b.id === p.bundleId);
  if (!bundle) {
    walletRepo.credit(p.number, p.amountKobo, 'refund', `refund:${txRef}`, 'bundle unavailable');
    walletRepo.markPending(txRef, { status: 'refunded' });
    await notify(p.number, `⚠️ That bundle no dey available again — ${naira(p.amountKobo)} don enter your *wallet* instead. Use .data to pick another.`);
    return true;
  }
  try {
    await payBill({
      type: bundle.flwName,
      customer: p.phone ?? p.number,
      amountNaira: bundle.amountNaira,
      reference: txRef,
    });
    walletRepo.markPending(txRef, { status: 'delivered' });
    await notify(
      p.number,
      `🎉 *Payment confirmed — data delivered!*\n\n📶 ${bundle.network} • ${bundle.flwName}\n📞 ${p.phone}\n🧾 Ref: ${txRef}`,
    );
    return true;
  } catch (err) {
    // Money collected but delivery failed → wallet credit, never vanish.
    walletRepo.credit(p.number, p.amountKobo, 'refund', `refund:${txRef}`, 'delivery failed');
    walletRepo.markPending(txRef, { status: 'refunded' });
    logger.warn({ err }, 'direct-buy delivery failed, credited wallet');
    await notify(
      p.number,
      `⚠️ Payment confirmed but the network delay deliver the bundle.\n\n✅ Your ${naira(p.amountKobo)} don enter your *wallet* — try again with .data (this time e go deliver from wallet instantly).`,
    );
    return true;
  }
}

const polling = new Set<string>();

function startPolling(txRef: string): void {
  if (polling.has(txRef)) return;
  polling.add(txRef);
  let attempts = 0;
  const timer = setInterval(async () => {
    attempts++;
    try {
      const done = await checkAndProcess(txRef);
      if (done || attempts >= POLL_ATTEMPTS) {
        clearInterval(timer);
        polling.delete(txRef);
      }
    } catch {
      if (attempts >= POLL_ATTEMPTS) {
        clearInterval(timer);
        polling.delete(txRef);
      }
    }
  }, POLL_INTERVAL_MS);
  timer.unref?.();
}

/** Re-check a user's open payments (used by .wallet so late payers get credited). */
export async function checkPendingFor(number: string): Promise<void> {
  for (const p of walletRepo.openPending(number)) {
    try {
      await checkAndProcess(p.txRef);
    } catch {
      /* next .wallet or poll will retry */
    }
  }
}

/** Boot recovery: resume watching payments that were open before a restart. */
export function resumePendingVtu(): void {
  const open = walletRepo.recentPending(24 * 60 * 60 * 1000);
  for (const p of open) startPolling(p.txRef);
  if (open.length) logger.info(`💰 VTU: resumed watching ${open.length} pending payment(s)`);
}

/* ────────────────────────── owner status ────────────────────────── */

/** Merchant-mode Flutterwave wallet balance (for the .vtu owner panel). */
export async function flwBalance(): Promise<string> {
  try {
    const res = await flw('get', '/balances');
    const list: any[] = (res as any)?.data ?? [];
    const ngn = list.find((b) => b.currency === 'NGN');
    return ngn ? `₦${Number(ngn.available_balance).toLocaleString('en-NG')}` : 'NGN n/a';
  } catch {
    return 'unavailable';
  }
}
