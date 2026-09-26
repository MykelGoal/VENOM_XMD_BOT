import axios from 'axios';
import { env } from '../config';
import { settingsRepo } from '../database/repositories/settings.repo';

const CLUB_BASE = 'https://www.nellobytesystems.com';
const CLUB_USER_KEY = 'vtu.clubkonnect.userid';
const CLUB_API_KEY = 'vtu.clubkonnect.apikey';

export type ClubNetwork = 'MTN' | 'Glo' | 'Airtel' | '9mobile';

export interface ClubBundle {
  network: ClubNetwork;
  networkId: string;
  planId: string;
  productCode: string;
  name: string;
  costKobo: number;
}

export type ClubTransactionState = 'delivered' | 'pending' | 'failed';

export interface ClubTransaction {
  state: ClubTransactionState;
  orderId?: string;
  statusCode?: number;
  status: string;
  detail: string;
}

function credentials(): { userId: string; apiKey: string } {
  const runtimeUser = (settingsRepo.get(CLUB_USER_KEY) ?? '').trim();
  const runtimeKey = (settingsRepo.get(CLUB_API_KEY) ?? '').trim();
  if (runtimeUser && runtimeKey) return { userId: runtimeUser, apiKey: runtimeKey };
  return {
    userId: env.vtu.clubkonnectUserId.trim(),
    apiKey: env.vtu.clubkonnectApiKey.trim(),
  };
}

export function clubkonnectCredentialSource(): 'runtime' | 'environment' | 'off' {
  const runtimeUser = (settingsRepo.get(CLUB_USER_KEY) ?? '').trim();
  const runtimeKey = (settingsRepo.get(CLUB_API_KEY) ?? '').trim();
  if (runtimeUser && runtimeKey) return 'runtime';
  if (env.vtu.clubkonnectUserId.trim() && env.vtu.clubkonnectApiKey.trim()) return 'environment';
  return 'off';
}

export function clubkonnectConfigured(): boolean {
  return clubkonnectCredentialSource() !== 'off';
}

export function setClubkonnectCredentials(userId: string, apiKey: string): void {
  settingsRepo.set(CLUB_USER_KEY, userId.trim());
  settingsRepo.set(CLUB_API_KEY, apiKey.trim());
}

export function removeClubkonnectCredentials(): boolean {
  const existed = clubkonnectCredentialSource() === 'runtime';
  settingsRepo.set(CLUB_USER_KEY, '');
  settingsRepo.set(CLUB_API_KEY, '');
  return existed;
}

export function clubkonnectCredentialStatus(): 'configured' | 'off' {
  return clubkonnectConfigured() ? 'configured' : 'off';
}

function parseJson(value: unknown): any {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    // Never quote raw provider bodies: authenticated responses can echo query
    // details and ClubKonnect credentials are transported as GET parameters.
    throw new Error('ClubKonnect returned invalid JSON');
  }
}

function redactProviderCredentials(value: unknown): string {
  return String(value ?? '')
    .replace(/([?&](?:APIKey|UserID)=)[^&\s"']*/gi, '$1[redacted]')
    .replace(/\b(?:APIKey|UserID)\s*[:=]\s*[^,\s}"']+/gi, '[credential redacted]');
}

export function safeClubkonnectError(err: unknown): Error {
  if (!axios.isAxiosError(err)) {
    return new Error(redactProviderCredentials(err instanceof Error ? err.message : err));
  }
  let payload: any = null;
  try {
    payload = parseJson(err.response?.data ?? '');
  } catch {
    // Ignore malformed bodies rather than leaking raw authenticated content.
  }
  const providerMessage =
    payload?.description ?? payload?.remark ?? payload?.status ?? payload?.message;
  return new Error(
    `ClubKonnect ${err.response?.status ?? 'network'}: ${redactProviderCredentials(
      providerMessage ?? err.message,
    ).slice(0, 180)}`,
  );
}

async function clubGet(path: string, params: Record<string, string>): Promise<any> {
  try {
    const { data } = await axios.get(`${CLUB_BASE}/${path}`, {
      params,
      timeout: 25_000,
      // Never log the Axios error object from this request: config.params
      // contains the provider API key. safeClubkonnectError strips that context.
      transformResponse: [(raw) => raw],
    });
    return parseJson(data);
  } catch (err) {
    throw safeClubkonnectError(err);
  }
}

const NETWORK_MAP: Record<string, ClubNetwork> = {
  MTN: 'MTN',
  Glo: 'Glo',
  Airtel: 'Airtel',
  m_9mobile: '9mobile',
};

/** Parse the public ClubKonnect catalogue into a provider-neutral list. */
export function parseClubkonnectBundles(payload: any): ClubBundle[] {
  const groups = payload?.MOBILE_NETWORK;
  if (!groups || typeof groups !== 'object') return [];
  const result: ClubBundle[] = [];

  for (const [groupName, rawGroup] of Object.entries(groups)) {
    const network = NETWORK_MAP[groupName];
    const group = Array.isArray(rawGroup) ? rawGroup[0] : undefined;
    if (!network || !group || !Array.isArray(group.PRODUCT)) continue;
    const networkId = String(group.ID ?? '');

    for (const raw of group.PRODUCT) {
      const planId = String(raw?.PRODUCT_ID ?? '');
      const amount = Number(raw?.PRODUCT_AMOUNT);
      if (!networkId || !planId || !Number.isFinite(amount) || amount <= 0) continue;
      result.push({
        network,
        networkId,
        planId,
        productCode: String(raw?.PRODUCT_CODE ?? ''),
        name: String(raw?.PRODUCT_NAME ?? planId),
        costKobo: Math.round(amount * 100),
      });
    }
  }

  return result.sort((a, b) => a.costKobo - b.costKobo || a.name.localeCompare(b.name));
}

let catalogueCache: { at: number; bundles: ClubBundle[] } | null = null;

export async function listClubkonnectBundles(): Promise<ClubBundle[]> {
  if (!catalogueCache || Date.now() - catalogueCache.at > 30 * 60 * 1000) {
    const payload = await clubGet('APIDatabundlePlansV2.asp', {});
    const bundles = parseClubkonnectBundles(payload);
    if (!bundles.length) throw new Error('ClubKonnect catalogue is empty');
    catalogueCache = { at: Date.now(), bundles };
  }
  return catalogueCache.bundles;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

/** Pure classifier kept exported so financial status rules stay regression-tested. */
export function classifyClubkonnectTransaction(payload: any): ClubTransaction {
  const statusCodeRaw =
    payload?.statuscode ?? payload?.statusCode ?? payload?.status_code ?? payload?.STATUSCODE;
  const statusCode = Number(statusCodeRaw);
  const hasCode = Number.isFinite(statusCode);
  const status = text(
    payload?.status ?? payload?.STATUS ?? payload?.orderstatus ?? payload?.orderStatus,
  ).toUpperCase();
  const orderId =
    text(payload?.orderid ?? payload?.orderId ?? payload?.OrderID ?? payload?.order_id) || undefined;
  const detail = text(
    payload?.description ?? payload?.remark ?? payload?.orderremark ?? payload?.message ?? status,
  ).slice(0, 180);

  if (status.includes('REFUNDED') || status.includes('CANCELLED') || (hasCode && statusCode === 899)) {
    return { state: 'failed', orderId, statusCode, status, detail };
  }
  if (hasCode && statusCode === 200 && status.includes('COMPLETED')) {
    return { state: 'delivered', orderId, statusCode, status, detail };
  }

  const pendingCode =
    hasCode &&
    (statusCode === 100 ||
      statusCode === 201 ||
      statusCode === 299 ||
      (statusCode >= 300 && statusCode <= 399) ||
      statusCode === 412 ||
      (statusCode >= 600 && statusCode <= 799));
  const pendingStatus =
    status.includes('RECEIVED') ||
    status.includes('PROCESSING') ||
    status.includes('ONHOLD') ||
    status.includes('PROCESSED');
  if (pendingCode || pendingStatus) {
    return { state: 'pending', orderId, statusCode, status, detail };
  }

  // Credential, input, insufficient-balance and terminal provider errors are
  // definitive when the provider returned them synchronously.
  return { state: 'failed', orderId, statusCode: hasCode ? statusCode : undefined, status, detail };
}

export async function clubkonnectBalance(): Promise<number> {
  const { userId, apiKey } = credentials();
  if (!userId || !apiKey) throw new Error('NO_CLUBKONNECT_KEY');
  const payload = await clubGet('APIWalletBalanceV1.asp', {
    UserID: userId,
    APIKey: apiKey,
  });
  const balance = Number(payload?.balance);
  if (!Number.isFinite(balance)) {
    const detail = String(
      payload?.description ?? payload?.remark ?? payload?.status ?? payload?.message ?? 'invalid response',
    );
    throw new Error(
      `ClubKonnect balance failed: ${redactProviderCredentials(detail).slice(0, 160)}`,
    );
  }
  return balance;
}

export function clubkonnectMobileNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('234') && digits.length === 13 ? `0${digits.slice(3)}` : digits;
}

export async function submitClubkonnectData(opts: {
  networkId: string;
  planId: string;
  phone: string;
  requestId: string;
  callbackUrl?: string;
}): Promise<ClubTransaction> {
  const { userId, apiKey } = credentials();
  if (!userId || !apiKey) throw new Error('NO_CLUBKONNECT_KEY');
  const payload = await clubGet('APIDatabundleV1.asp', {
    UserID: userId,
    APIKey: apiKey,
    MobileNetwork: opts.networkId,
    DataPlan: opts.planId,
    MobileNumber: clubkonnectMobileNumber(opts.phone),
    RequestID: opts.requestId,
    ...(opts.callbackUrl ? { CallBackURL: opts.callbackUrl } : {}),
  });
  return classifyClubkonnectTransaction(payload);
}

export async function queryClubkonnectTransaction(opts: {
  requestId: string;
  orderId?: string;
}): Promise<ClubTransaction> {
  const { userId, apiKey } = credentials();
  if (!userId || !apiKey) throw new Error('NO_CLUBKONNECT_KEY');
  const payload = await clubGet('APIQueryV1.asp', {
    UserID: userId,
    APIKey: apiKey,
    ...(opts.orderId ? { OrderID: opts.orderId } : { RequestID: opts.requestId }),
  });
  return classifyClubkonnectTransaction(payload);
}
