import { env } from '../config';
import { logger } from '../utils/logger';

/**
 * Host platform integration.
 *
 * Lets the bot persist configuration (e.g. AI keys set via `.setkey`) as REAL
 * environment variables on the hosting platform, so they survive redeploys,
 * restarts and new commits — the #1 pain point on ephemeral free hosts like
 * Render whose local disk (and our JSON store) is wiped on every deploy.
 *
 * Currently supports Render via its public API:
 *   PUT https://api.render.com/v1/services/{serviceId}/env-vars/{key}
 *
 * Setting an env var through the API triggers Render to redeploy the service
 * (that's how the new value takes effect), so callers should warn the owner
 * that a short restart will follow.
 */

/** Is a host provider configured for persistence? */
export function hostPersistenceEnabled(): boolean {
  return Boolean(env.host.renderApiKey && env.host.renderServiceId);
}

/** Human-readable name of the active host provider, or null. */
export function hostProviderName(): string | null {
  if (env.host.renderApiKey && env.host.renderServiceId) return 'Render';
  return null;
}

export interface HostSaveResult {
  ok: boolean;
  provider: string | null;
  /** True when saving the var triggers a redeploy/restart of the service. */
  willRestart: boolean;
  error?: string;
}

/**
 * Persist a single env var on the host platform.
 * Returns ok:false (never throws) so callers can fall back gracefully.
 */
export async function saveHostEnvVar(
  key: string,
  value: string,
): Promise<HostSaveResult> {
  if (env.host.renderApiKey && env.host.renderServiceId) {
    return saveRenderEnvVar(key, value);
  }
  return { ok: false, provider: null, willRestart: false, error: 'NO_HOST' };
}

async function saveRenderEnvVar(
  key: string,
  value: string,
): Promise<HostSaveResult> {
  const url = `https://api.render.com/v1/services/${encodeURIComponent(
    env.host.renderServiceId,
  )}/env-vars/${encodeURIComponent(key)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${env.host.renderApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ value }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (res.ok) {
      logger.info(`💾 Persisted env var ${key} to Render (will redeploy).`);
      return { ok: true, provider: 'Render', willRestart: true };
    }

    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) detail = body.message;
    } catch {
      /* ignore parse errors */
    }
    if (res.status === 401 || res.status === 403) detail = 'invalid RENDER_API_KEY';
    if (res.status === 404) detail = 'RENDER_SERVICE_ID not found';

    logger.warn(`Render env-var save failed for ${key}: ${detail}`);
    return { ok: false, provider: 'Render', willRestart: false, error: detail };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network error';
    logger.warn(`Render env-var save error for ${key}: ${msg}`);
    return { ok: false, provider: 'Render', willRestart: false, error: msg };
  }
}
