/** Pause execution for the given milliseconds. */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Strip the WhatsApp suffix from a JID to get the bare number. */
export const jidToNumber = (jid: string): string =>
  jid.split('@')[0].split(':')[0];

/** Turn a bare number into a user JID. */
export const numberToJid = (number: string): string =>
  `${number.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

/** Basic URL check. */
export const isUrl = (text: string): boolean =>
  /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(text.trim());

/** Human-readable byte size. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

/** Format an uptime in seconds as "1d 2h 3m 4s". */
export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`]
    .filter(Boolean)
    .join(' ');
}
