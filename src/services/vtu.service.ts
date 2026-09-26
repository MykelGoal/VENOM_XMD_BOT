/**
 * VTU service — ClubKonnect data delivery with optional Flutterwave
 * bank-transfer collection and legacy airtime fulfilment.
 *
 * Two modes (auto-detected, keys NEVER live in the repo):
 *   • merchant — ClubKonnect is preferred for data when configured;
 *     Flutterwave remains the bank-transfer collection lane and fallback.
 *   • gateway — a central Venom Gateway server holds its own keys
 *     (VTU_GATEWAY_URL + VTU_GATEWAY_KEY). Deployers just point at it.
 *
 * Money rules (non-negotiable):
 *   • Balances/prices internally in KOBO (integers only).
 *   • Wallet credits are idempotent per tx_ref — replayed payment
 *     notifications can never double-credit.
 *   • Payments only count when Flutterwave's own verify endpoint says
 *     successful AND the amount matches. Never a user's word or screenshot.
 *   • Definitive failed deliveries after payment auto-refund to the wallet.
 *   • Ambiguous provider timeouts are requeried, never blindly resubmitted.
 *   • Pending payments persist to disk — a restart never loses money.
 */
import axios from 'axios';
import { env } from '../config';
import { logger } from '../utils/logger';
import { settingsRepo } from '../database/repositories/settings.repo';
import { PendingPayment, walletRepo } from '../database/repositories/wallet.repo';
import { flushMongo } from '../database/mongo';
import {
  FLUTTERWAVE_CHECKOUT_OPTIONS,
  isFlutterwaveTestSecretKey,
  isValidFlutterwaveSecretKey,
} from '../utils/flutterwave';
import {
  ClubTransaction,
  clubkonnectBalance,
  clubkonnectConfigured,
  listClubkonnectBundles,
  queryClubkonnectTransaction,
  submitClubkonnectData,
} from './clubkonnect.service';

// Re-exported so the VTU commands have a single service facade.
export { walletRepo };

const FLW = env.vtu.flwBaseUrl.replace(/\/$/, '');
const POLL_INTERVAL_MS = 15_000;
const POLL_ATTEMPTS = 40; // ~10 minutes of watching per payment

export type VtuMode = 'off' | 'merchant' | 'gateway';
export type Network = 'MTN' | 'Glo' | 'Airtel' | '9mobile';

export interface Bundle {
  /** Legacy numeric identifier kept for older pending Flutterwave purchases. */
  id: number;
  provider: 'flutterwave' | 'clubkonnect';
  /** Stable provider-specific identifier; unlike Number(), preserves 1000 vs 1000.00. */
  providerCode: string;
  network: Network;
  /** Flutterwave-only Bills API route identifiers. */
  billerCode?: string;
  itemCode?: string;
  /** Human-readable bundle name shown to customers. */
  flwName: string;
  /** Fulfilment provider cost (naira, before the owner's markup). */
  amountNaira: number;
  /** Selling price (kobo): provider cost + owner margin, rounded to ₦5. */
  priceKobo: number;
}

/* ────────────────────────── mode & keys ────────────────────────── */

export function flwSecretKey(): string {
  return (settingsRepo.get('vtu.flwsecret') || '').trim() || env.vtu.flwSecret.trim();
}

export function vtuMode(): VtuMode {
  if (clubkonnectConfigured() || flwSecretKey()) return 'merchant';
  if (env.vtu.gatewayUrl.trim()) return 'gateway';
  return 'off';
}

export function fulfilmentProvider(): 'clubkonnect' | 'flutterwave' | 'off' {
  if (clubkonnectConfigured()) return 'clubkonnect';
  if (flwSecretKey()) return 'flutterwave';
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
  return '💳 VTU is not activated yet.\n_Owner: configure collections with `.setkey flutterwave …` or data fulfilment with `.setkey clubkonnect USERID|APIKEY` in my private DM._';
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
        }${
          // FLW sometimes attaches an errors/data object saying exactly which
          // parameter it hates — surface it so debugging isn't guesswork.
          (err.response?.data as any)?.errors
            ? ` ${JSON.stringify((err.response?.data as any).errors).slice(0, 150)}`
            : (err.response?.data as any)?.data
              ? ` ${JSON.stringify((err.response?.data as any).data).slice(0, 150)}`
              : ''
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

let flutterwaveBundleCache: { at: number; bundles: Bundle[] } | null = null;

function stableNumericId(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

async function listFlutterwaveBundles(): Promise<Bundle[]> {
  if (!flutterwaveBundleCache || Date.now() - flutterwaveBundleCache.at > 60 * 60 * 1000) {
    const res = await flw('get', '/bill-categories?country=NG');
    const items: any[] = res?.data ?? [];
    flutterwaveBundleCache = {
      at: Date.now(),
      bundles: items
        .filter(
          (i) =>
            BILLER_NETWORK[i.biller_code] &&
            !i.is_airtime &&
            Number(i.amount) > 0 &&
            typeof i.item_code === 'string' &&
            i.item_code,
        )
        .map((i) => ({
          id: Number(i.id),
          provider: 'flutterwave' as const,
          providerCode: `${i.biller_code}:${i.item_code}`,
          network: BILLER_NETWORK[i.biller_code],
          billerCode: String(i.biller_code),
          itemCode: String(i.item_code),
          flwName: String(i.name),
          amountNaira: Number(i.amount),
          priceKobo: priceWithMargin(Number(i.amount)),
        }))
        .sort((a, b) => a.amountNaira - b.amountNaira),
    };
  }
  return flutterwaveBundleCache.bundles;
}

async function listBundlesForProvider(
  provider: 'clubkonnect' | 'flutterwave',
): Promise<Bundle[]> {
  if (provider === 'clubkonnect') {
    return (await listClubkonnectBundles()).map((bundle) => {
      const providerCode = `${bundle.networkId}:${bundle.planId}`;
      const amountNaira = bundle.costKobo / 100;
      return {
        id: stableNumericId(`clubkonnect:${providerCode}`),
        provider: 'clubkonnect' as const,
        providerCode,
        network: bundle.network,
        flwName: bundle.name,
        amountNaira,
        priceKobo: priceWithMargin(amountNaira),
      };
    });
  }
  return listFlutterwaveBundles();
}

async function listPrimaryBundles(): Promise<Bundle[]> {
  return listBundlesForProvider(clubkonnectConfigured() ? 'clubkonnect' : 'flutterwave');
}

export async function listBundles(network?: Network): Promise<Bundle[]> {
  const all = await listPrimaryBundles();
  return network ? all.filter((bundle) => bundle.network === network) : all;
}

/** Resolve a bundle by network + display code (1-based index in price order). */
export async function bundleByCode(network: Network, code: number): Promise<Bundle | undefined> {
  const list = await listBundles(network);
  return list[code - 1];
}

/* ────────────────────────── payment links ────────────────────────── */

/**
 * The bot's own WhatsApp number (digits), wired from connection.ts at boot.
 * Used as the payment redirect: after paying, the customer's browser opens
 * WhatsApp straight back into the bot chat where their receipt lands.
 */
let botPhoneDigits = '';

/** Called from connection.ts once the socket knows its own JID. */
export function setVtuBotPhone(jid: string): void {
  // "2348031234567:12@s.whatsapp.net" → "2348031234567"
  botPhoneDigits = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

function txRef(kind: 'fund' | 'data' | 'air', number: string): string {
  // Digits only: Flutterwave rejects special characters (like +) in tx_ref.
  const n = number.replace(/\D/g, '');
  return `VENOM-${kind.toUpperCase()}-${n}-${Date.now()}-${Math.random()
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
  const digits = opts.number.replace(/\D/g, ''); // 2348031234567
  // Flutterwave requires a syntactically valid email; the session site's real
  // host keeps strict validators happy (no mailbox is ever read).
  const emailHost = (() => {
    try {
      return new URL(env.session.siteUrl).host;
    } catch {
      return 'session-site-2odn.onrender.com';
    }
  })();
  const res = await flw('post', '/payments', {
    tx_ref: opts.txRef,
    amount: opts.amountNaira,
    currency: 'NGN',
    // REQUIRED in practice (FLW returns 400 "One or more required parameters
    // missing" without it) even though the docs don't mark it so.
    redirect_url: botPhoneDigits
      ? `https://wa.me/${botPhoneDigits}`
      : env.session.siteUrl,
    // Owner preference: transfer-only checkout. Flutterwave also requires the
    // method to be enabled on the merchant dashboard.
    payment_options: FLUTTERWAVE_CHECKOUT_OPTIONS,
    customer: {
      // Email is REQUIRED by FLW — user<digits>@ keeps it valid (no leading +).
      email: `user${digits}@${emailHost}`,
      phonenumber: digits,
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
  await flushMongo(); // the payment watch itself survives a crash
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
    bundleCode: bundle.providerCode,
    bundleName: bundle.flwName,
    provider: bundle.provider,
    network: bundle.network,
    phone,
    status: 'pending',
    createdAt: Date.now(),
  });
  await flushMongo(); // persist the exact bundle/provider before exposing the link
  startPolling(tx);
  return { txRef: tx, link };
}

/* ────────────────────────── fulfilment ────────────────────────── */

/** Deliver a data bundle through Flutterwave's current bill-item endpoint. */
async function payDataBundle(opts: {
  billerCode: string;
  itemCode: string;
  customer: string; // +234… phone
  amountNaira: number; // FLW price (NOT the user's margin price)
  reference: string;
}): Promise<void> {
  try {
    const res = await flw(
      'post',
      `/billers/${encodeURIComponent(opts.billerCode)}/items/${encodeURIComponent(opts.itemCode)}/payment`,
      {
        country: 'NG',
        customer_id: opts.customer,
        amount: opts.amountNaira,
        reference: opts.reference,
      },
    );
    const status = (res as any)?.status ?? (res as any)?.data?.status;
    if (status !== 'success') throw new Error(`bill status: ${String(status)}`);
    clearVtuError();
  } catch (err) {
    rememberVtuError('data delivery', err);
    throw err;
  }
}

type DataDeliveryOutcome =
  | { state: 'delivered' }
  | { state: 'pending'; detail: string }
  | { state: 'failed'; detail: string };

function clubStatusLabel(result: ClubTransaction): string {
  return `${result.statusCode ?? ''}:${result.status}`.slice(0, 120);
}

async function rememberClubResult(
  pending: PendingPayment,
  result: ClubTransaction,
): Promise<void> {
  walletRepo.markPending(pending.txRef, {
    providerOrderId: result.orderId ?? pending.providerOrderId,
    providerCheckedAt: Date.now(),
    providerStatus: clubStatusLabel(result),
  });
  await flushMongo();
}

async function attemptClubkonnectData(
  pending: PendingPayment,
  bundle: Bundle,
): Promise<DataDeliveryOutcome> {
  const [networkId, ...planParts] = bundle.providerCode.split(':');
  const planId = planParts.join(':');
  if (!networkId || !planId) {
    return { state: 'failed', detail: 'invalid ClubKonnect bundle identifier' };
  }

  // A submitted order must be requeried before any retry. This prevents a
  // timeout from causing the same data bundle to be delivered twice. Poll at
  // most once per minute while ClubKonnect runs its own five-minute retries.
  if (pending.providerSubmittedAt) {
    if (
      pending.providerCheckedAt &&
      Date.now() - pending.providerCheckedAt < 60 * 1000
    ) {
      return { state: 'pending', detail: pending.providerStatus || 'awaiting provider reconciliation' };
    }
    try {
      const queried = await queryClubkonnectTransaction({
        requestId: pending.txRef,
        orderId: pending.providerOrderId,
      });
      await rememberClubResult(pending, queried);
      if (queried.state === 'delivered') {
        clearVtuError();
        return { state: 'delivered' };
      }
      if (queried.state === 'pending') {
        if (Date.now() - pending.providerSubmittedAt >= 65 * 60 * 1000) {
          rememberVtuError(
            'ClubKonnect reconciliation',
            new Error('provider retry window elapsed; order remains pending'),
          );
        }
        return { state: 'pending', detail: queried.detail || queried.status };
      }

      // A failed-looking query can itself be an auth/input/not-found response.
      // Refund only when the response is tied to an actual provider order or
      // explicitly says it was cancelled/refunded. Otherwise leave the debit
      // pending for owner reconciliation rather than risk free delivered data.
      const terminalStatus =
        queried.status.includes('CANCELLED') || queried.status.includes('REFUNDED');
      if (!queried.orderId && !terminalStatus) {
        const detail =
          Date.now() - pending.providerSubmittedAt >= 65 * 60 * 1000
            ? 'provider retry window elapsed; manual reconciliation required'
            : queried.detail || 'awaiting provider reconciliation';
        rememberVtuError('ClubKonnect data requery', new Error(detail));
        return { state: 'pending', detail };
      }
      rememberVtuError('ClubKonnect data requery', new Error(queried.detail || queried.status));
      return { state: 'failed', detail: queried.detail || queried.status };
    } catch (err) {
      rememberVtuError('ClubKonnect data requery', err);
      walletRepo.markPending(pending.txRef, {
        providerCheckedAt: Date.now(),
        providerStatus: 'QUERY_ERROR',
      });
      await flushMongo();
      return { state: 'pending', detail: safeDiagnosticError(err) };
    }
  }

  walletRepo.markPending(pending.txRef, {
    provider: 'clubkonnect',
    providerSubmittedAt: Date.now(),
    providerStatus: 'SUBMITTING',
  });
  await flushMongo();

  try {
    const submitted = await submitClubkonnectData({
      networkId,
      planId,
      phone: pending.phone ?? pending.number,
      requestId: pending.txRef,
    });
    await rememberClubResult(
      { ...pending, providerSubmittedAt: Date.now() },
      submitted,
    );
    if (submitted.state === 'delivered') {
      clearVtuError();
      return { state: 'delivered' };
    }
    if (submitted.state === 'pending') {
      return { state: 'pending', detail: submitted.detail || submitted.status };
    }
    rememberVtuError('ClubKonnect data submission', new Error(submitted.detail || submitted.status));
    return { state: 'failed', detail: submitted.detail || submitted.status };
  } catch (err) {
    // The provider may have received a request even if our HTTP connection
    // timed out. Keep it pending and requery by the same request ID.
    rememberVtuError('ClubKonnect data submission', err);
    return { state: 'pending', detail: safeDiagnosticError(err) };
  }
}

async function attemptDataDelivery(
  pending: PendingPayment,
  bundle: Bundle,
): Promise<DataDeliveryOutcome> {
  if (bundle.provider === 'clubkonnect') {
    return attemptClubkonnectData(pending, bundle);
  }
  if (!bundle.billerCode || !bundle.itemCode) {
    return { state: 'failed', detail: 'invalid Flutterwave bundle identifier' };
  }
  try {
    await payDataBundle({
      billerCode: bundle.billerCode,
      itemCode: bundle.itemCode,
      customer: pending.phone ?? pending.number,
      amountNaira: bundle.amountNaira,
      reference: pending.txRef,
    });
    return { state: 'delivered' };
  } catch (err) {
    return { state: 'failed', detail: safeDiagnosticError(err) };
  }
}

/** Airtime remains on Flutterwave's variable-amount AIRTIME bill route. */
async function payAirtimeBill(opts: {
  customer: string;
  amountNaira: number;
  reference: string;
}): Promise<void> {
  try {
    const res = await flw('post', '/bills', {
      country: 'NG',
      customer: opts.customer,
      amount: opts.amountNaira,
      recurrence: 'ONCE',
      type: 'AIRTIME',
      reference: opts.reference,
    });
    const status = (res as any)?.status ?? (res as any)?.data?.status;
    if (status !== 'success') throw new Error(`bill status: ${String(status)}`);
    clearVtuError();
  } catch (err) {
    rememberVtuError('airtime delivery', err);
    throw err;
  }
}

/**
 * True when a bill payment with this reference already exists at Flutterwave
 * (GET /v3/bills/{reference}). Used on crash-resume so a delivery that
 * succeeded right before a restart is NEVER paid for twice.
 */
async function billExists(reference: string): Promise<boolean> {
  try {
    const res = await flw('get', `/bills/${encodeURIComponent(reference)}`);
    return Boolean((res as any)?.data);
  } catch {
    return false; // 404 / error → no bill with that reference yet
  }
}

/** Buy with wallet balance (instant). Refunds the wallet if delivery fails. */
export async function purchaseWithWallet(
  number: string,
  bundle: Bundle,
  phone: string,
): Promise<
  | { ok: true; txRef: string; pending?: boolean }
  | { ok: false; error: string }
> {
  const tx = txRef('data', number);
  try {
    walletRepo.debit(number, bundle.priceKobo, 'purchase', tx, `${bundle.network} ${bundle.flwName}`);
  } catch {
    return { ok: false, error: 'INSUFFICIENT' };
  }
  // Record the in-flight purchase BEFORE paying: if the process dies
  // mid-way, boot recovery finishes (or refunds) it — the debited money
  // can never vanish with the process.
  walletRepo.addPending({
    txRef: tx,
    number,
    kind: 'data',
    amountKobo: bundle.priceKobo,
    bundleId: bundle.id,
    bundleCode: bundle.providerCode,
    bundleName: bundle.flwName,
    provider: bundle.provider,
    network: bundle.network,
    phone,
    status: 'paid', // the money already left the wallet
    createdAt: Date.now(),
  });
  await flushMongo(); // debit + record survive a crash from here on
  const pending = walletRepo.getPending(tx)!;
  const outcome = await attemptDataDelivery(pending, bundle);
  if (outcome.state === 'delivered') {
    walletRepo.markPending(tx, { status: 'delivered' });
    await flushMongo();
    return { ok: true, txRef: tx };
  }
  if (outcome.state === 'pending') {
    walletRepo.markPending(tx, { providerPendingNotifiedAt: Date.now() });
    await flushMongo();
    startPolling(tx);
    return { ok: true, txRef: tx, pending: true };
  }

  // A definitive provider failure returns the full selling price immediately.
  walletRepo.credit(number, bundle.priceKobo, 'refund', `refund:${tx}`, 'delivery failed');
  walletRepo.markPending(tx, { status: 'refunded' });
  await flushMongo();
  logger.warn({ detail: outcome.detail }, 'VTU delivery failed, wallet refunded');
  return { ok: false, error: 'DELIVERY_FAILED' };
}

/** Airtime: sold at face value (Flutterwave's ~2-3% commission covers fees). */
export async function buyAirtime(
  number: string,
  amountNaira: number,
  phone: string,
): Promise<{ ok: true; txRef: string } | { ok: false; error: string }> {
  if (amountNaira < 50 || amountNaira > 20000) return { ok: false, error: 'BAD_AMOUNT' };
  if (!flwSecretKey()) return { ok: false, error: 'NO_FLW_KEY' };
  const tx = txRef('air', number);
  const kobo = Math.round(amountNaira * 100);
  try {
    walletRepo.debit(number, kobo, 'purchase', tx, `Airtime ${naira(kobo)} → ${phone}`);
  } catch {
    return { ok: false, error: 'INSUFFICIENT' };
  }
  // In-flight record (same crash-safety as data purchases).
  walletRepo.addPending({
    txRef: tx,
    number,
    kind: 'airtime',
    amountKobo: kobo,
    phone,
    status: 'paid',
    createdAt: Date.now(),
  });
  await flushMongo();
  try {
    await payAirtimeBill({ customer: phone, amountNaira, reference: tx });
    walletRepo.markPending(tx, { status: 'delivered' });
    await flushMongo();
    return { ok: true, txRef: tx };
  } catch (err) {
    walletRepo.credit(number, kobo, 'refund', `refund:${tx}`, 'airtime failed');
    walletRepo.markPending(tx, { status: 'refunded' });
    await flushMongo();
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
  // 'paid' = money was already verified (or taken from the wallet) before a
  // restart — resume straight to fulfilment. Never re-verify, never re-charge.
  if (!p || (p.status !== 'pending' && p.status !== 'paid')) return true;

  if (p.status === 'pending') {
    if (!(await verifyPaid(txRef, p.amountKobo))) return false;
    walletRepo.markPending(txRef, { status: 'paid', paidAt: Date.now() });
    await flushMongo(); // "money received" survives a crash from here on
  }

  if (p.kind === 'fund') {
    const credited = walletRepo.credit(p.number, p.amountKobo, 'fund', txRef, 'wallet top-up');
    const balance = walletRepo.balance(p.number);
    await flushMongo();
    await notify(
      p.number,
      credited
        ? `💰 *Payment confirmed!*\n\n✅ ${naira(p.amountKobo)} don enter your wallet.\n💼 Balance: *${naira(balance)}*\n\n_Oya buy data: .data_`
        : `✅ Payment confirmed — your wallet balance na *${naira(balance)}*.`,
    );
    walletRepo.markPending(txRef, { status: 'delivered' });
    await flushMongo();
    return true;
  }

  if (p.kind === 'airtime') {
    // Wallet-lane airtime (money already debited pre-crash): deliver it.
    const amountNaira = (p.amountKobo ?? 0) / 100;
    try {
      if (!(await billExists(txRef))) {
        await payAirtimeBill({
          customer: p.phone ?? p.number,
          amountNaira,
          reference: txRef,
        });
      }
      walletRepo.markPending(txRef, { status: 'delivered' });
      await flushMongo();
      await notify(p.number, `✅ *Airtime delivered!*\n\n📶 ${naira(p.amountKobo ?? 0)} → ${p.phone}\n🧾 Ref: ${txRef}`);
      return true;
    } catch (err) {
      walletRepo.credit(p.number, p.amountKobo ?? 0, 'refund', `refund:${txRef}`, 'airtime failed');
      walletRepo.markPending(txRef, { status: 'refunded' });
      await flushMongo();
      logger.warn({ err }, 'airtime resume failed, wallet refunded');
      await notify(p.number, `⚠️ Airtime no deliver — ${naira(p.amountKobo ?? 0)} don enter your *wallet* back. Try again small time.`);
      return true;
    }
  }

  // Direct buy-now or wallet data order: resume against the provider that
  // originally priced it, even if the owner changes providers later.
  const provider = p.provider ?? 'flutterwave';
  let bundle: Bundle | undefined;
  // A plan may disappear (or the catalogue endpoint may be down) while an
  // accepted order is processing. Requery the persisted exact order without
  // depending on today's catalogue.
  if (provider === 'clubkonnect' && p.providerSubmittedAt && p.bundleCode) {
    bundle = {
      id: p.bundleId ?? 0,
      provider: 'clubkonnect',
      providerCode: p.bundleCode,
      network: (p.network ?? 'MTN') as Network,
      flwName: p.bundleName ?? 'Data bundle',
      amountNaira: 0,
      priceKobo: p.amountKobo,
    };
  } else {
    const bundles = await listBundlesForProvider(provider);
    bundle = bundles.find(
      (candidate) =>
        candidate.network === (p.network ?? 'MTN') &&
        (p.bundleCode
          ? candidate.providerCode === p.bundleCode
          : candidate.id === p.bundleId),
    );
  }
  if (!bundle) {
    walletRepo.credit(p.number, p.amountKobo, 'refund', `refund:${txRef}`, 'bundle unavailable');
    walletRepo.markPending(txRef, { status: 'refunded' });
    await flushMongo();
    await notify(p.number, `⚠️ That bundle no dey available again — ${naira(p.amountKobo)} don enter your *wallet* instead. Use .data to pick another.`);
    return true;
  }

  // Legacy Flutterwave orders may already have succeeded immediately before a
  // crash. Query first so they are never submitted twice.
  if (provider === 'flutterwave' && (await billExists(txRef))) {
    walletRepo.markPending(txRef, { status: 'delivered' });
    await flushMongo();
    await notify(
      p.number,
      `🎉 *Payment confirmed — data delivered!*\n\n📶 ${bundle.network} • ${bundle.flwName}\n📞 ${p.phone}\n🧾 Ref: ${txRef}`,
    );
    return true;
  }

  const outcome = await attemptDataDelivery(p, bundle);
  if (outcome.state === 'pending') {
    if (!p.providerPendingNotifiedAt) {
      walletRepo.markPending(txRef, { providerPendingNotifiedAt: Date.now() });
      await flushMongo();
      await notify(
        p.number,
        `⏳ *Payment confirmed — data is processing*\n\n📶 ${bundle.network} • ${bundle.flwName}\n📞 ${p.phone}\n🧾 Ref: ${txRef}\n\n_I will message you after the provider confirms delivery._`,
      );
    }
    return false;
  }
  if (outcome.state === 'delivered') {
    walletRepo.markPending(txRef, { status: 'delivered' });
    await flushMongo();
    await notify(
      p.number,
      `🎉 *Payment confirmed — data delivered!*\n\n📶 ${bundle.network} • ${bundle.flwName}\n📞 ${p.phone}\n🧾 Ref: ${txRef}`,
    );
    return true;
  }

  // Definitive provider failure: credit the complete selling price once.
  walletRepo.credit(p.number, p.amountKobo, 'refund', `refund:${txRef}`, 'delivery failed');
  walletRepo.markPending(txRef, { status: 'refunded' });
  await flushMongo();
  logger.warn({ detail: outcome.detail }, 'data delivery failed, credited wallet');
  await notify(
    p.number,
    `⚠️ Data no deliver.\n\n✅ Your ${naira(p.amountKobo)} don return to your *wallet*. Pick another bundle with .data.`,
  );
  return true;
}

const polling = new Set<string>();

function startPolling(txRef: string): void {
  if (polling.has(txRef)) return;
  polling.add(txRef);
  let attempts = 0;
  let checking = false;
  const timer = setInterval(async () => {
    if (checking) return;
    checking = true;
    attempts++;
    try {
      const done = await checkAndProcess(txRef);
      const current = walletRepo.getPending(txRef);
      const maxAttempts =
        current?.provider === 'clubkonnect' && current.providerSubmittedAt
          ? Math.ceil((70 * 60 * 1000) / POLL_INTERVAL_MS)
          : POLL_ATTEMPTS;
      if (done || attempts >= maxAttempts) {
        clearInterval(timer);
        polling.delete(txRef);
      }
    } catch {
      const current = walletRepo.getPending(txRef);
      const maxAttempts =
        current?.provider === 'clubkonnect' && current.providerSubmittedAt
          ? Math.ceil((70 * 60 * 1000) / POLL_INTERVAL_MS)
          : POLL_ATTEMPTS;
      if (attempts >= maxAttempts) {
        clearInterval(timer);
        polling.delete(txRef);
      }
    } finally {
      checking = false;
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

const VTU_LAST_ERROR_KEY = 'vtu.last-provider-error';

function safeDiagnosticError(err: unknown): string {
  return (err instanceof Error ? err.message : String(err))
    .replace(/FLWSECK[^\s"']*/gi, '[secret]')
    .replace(/([?&](?:APIKey|UserID)=)[^&\s"']*/gi, '$1[redacted]')
    .replace(/\b(?:APIKey|UserID)\s*[:=]\s*[^,\s}"']+/gi, '[credential redacted]')
    .slice(0, 220);
}

function rememberVtuError(stage: string, err: unknown): void {
  settingsRepo.set(
    VTU_LAST_ERROR_KEY,
    JSON.stringify({ at: Date.now(), stage, detail: safeDiagnosticError(err) }),
  );
}

function clearVtuError(): void {
  settingsRepo.set(VTU_LAST_ERROR_KEY, '');
}

function lastVtuError(): { at: number; stage: string; detail: string } | null {
  try {
    const parsed = JSON.parse(settingsRepo.get(VTU_LAST_ERROR_KEY) || 'null');
    return parsed && typeof parsed.detail === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Read-only owner diagnostics. This never creates a charge or bill; it checks
 * key shape, Flutterwave authentication/balance access and the bundle catalog.
 */
export async function vtuDiagnostics(): Promise<string[]> {
  const key = flwSecretKey();
  const provider = fulfilmentProvider();
  const lines = [
    `📦 Data provider: *${provider === 'clubkonnect' ? 'ClubKonnect' : provider === 'flutterwave' ? 'Flutterwave' : 'OFF'}*`,
  ];

  const previousFailure = lastVtuError();
  if (previousFailure) {
    lines.push(
      `⚠️ Last provider failure (${previousFailure.stage}, ${new Date(previousFailure.at).toISOString()}): ${previousFailure.detail}`,
    );
  }

  if (clubkonnectConfigured()) {
    try {
      const balance = await clubkonnectBalance();
      lines.push(
        `✅ ClubKonnect authentication works — provider balance: *₦${balance.toLocaleString('en-NG')}*`,
      );
    } catch (err) {
      lines.push(`❌ ClubKonnect API check failed: ${safeDiagnosticError(err)}`);
    }
  } else {
    lines.push('⚪ ClubKonnect data credentials are not configured.');
  }

  if (!key) {
    lines.push('⚪ Flutterwave collection key is not configured — wallet-only purchases can still work.');
  } else if (!isValidFlutterwaveSecretKey(key)) {
    lines.push(
      '❌ The saved Flutterwave key is malformed. Rotate it, remove it with *.setkey remove flutterwave*, then save the replacement privately.',
    );
  } else {
    lines.push(
      `🔑 Flutterwave key: *${isFlutterwaveTestSecretKey(key) ? 'TEST' : 'LIVE'}*`,
      `💳 Checkout method: *${FLUTTERWAVE_CHECKOUT_OPTIONS}*`,
    );
    try {
      const res = await flw('get', '/balances');
      const balances: any[] = (res as any)?.data ?? [];
      const ngn = balances.find((entry) => entry.currency === 'NGN');
      lines.push(
        `✅ Flutterwave collection API works${
          ngn ? ` — NGN available balance: *₦${Number(ngn.available_balance).toLocaleString('en-NG')}*` : ''
        }`,
      );
    } catch (err) {
      lines.push(`❌ Flutterwave API check failed: ${safeDiagnosticError(err)}`);
    }
  }

  try {
    lines.push(`✅ Active bundle catalogue loaded: *${(await listBundles()).length}* items`);
  } catch (err) {
    lines.push(`❌ Bundle catalogue failed: ${safeDiagnosticError(err)}`);
  }

  lines.push(
    'ℹ️ Keep enough money in the active fulfilment provider wallet; Venom wallet balances are separate.',
    'ℹ️ Checkout remains bank-transfer only. ClubKonnect data orders are requeried before any retry to prevent duplicate delivery.',
  );
  return lines;
}

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
