import { env } from '../config';

// key = `${number}:${command}` → timestamp of last use
const lastUsed = new Map<string, number>();

/**
 * Returns the remaining cooldown in whole seconds (0 if ready).
 * Records the current time as the last-use when allowed.
 */
export function checkCooldown(number: string, command: string): number {
  const key = `${number}:${command}`;
  const now = Date.now();
  const previous = lastUsed.get(key) ?? 0;
  const elapsed = now - previous;

  if (elapsed < env.cooldownMs) {
    return Math.ceil((env.cooldownMs - elapsed) / 1000);
  }

  lastUsed.set(key, now);
  return 0;
}
