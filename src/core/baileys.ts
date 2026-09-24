import type * as BaileysModule from '@whiskeysockets/baileys';

/**
 * Baileys 6.7.19+ is ESM-only, while VENOM-XMD is currently compiled as
 * CommonJS. TypeScript rewrites a normal dynamic import() to require() in a
 * CommonJS build, which causes ERR_REQUIRE_ESM at runtime. Using the native
 * import function through this tiny bridge lets the existing CommonJS app
 * load modern Baileys without converting every source import to NodeNext.
 */
type BaileysApi = typeof BaileysModule;

let api: BaileysApi | undefined;
let loading: Promise<BaileysApi> | undefined;

const nativeImport = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<BaileysApi>;

/** Load Baileys exactly once during application bootstrap. */
export async function initBaileys(): Promise<BaileysApi> {
  if (api) return api;
  loading ??= nativeImport('@whiskeysockets/baileys');
  api = await loading;
  return api;
}

/**
 * Return the loaded Baileys namespace. main() calls initBaileys() before the
 * session or socket starts, so reaching this guard indicates a boot-order bug.
 */
export function getBaileys(): BaileysApi {
  if (!api) {
    throw new Error('Baileys has not been initialised. Call initBaileys() first.');
  }
  return api;
}
