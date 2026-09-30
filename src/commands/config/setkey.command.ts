import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import {
  AI_PROVIDER_NAMES,
  configuredProviders,
  getRuntimeAIKey,
  maskKey,
  removeRuntimeAIKey,
  setRuntimeAIKey,
  setRuntimeAIModel,
  getRuntimeAIModel,
  envKeyNameFor,
} from '../../services/ai.service';
import {
  hostPersistenceEnabled,
  hostProviderName,
  saveHostEnvVar,
} from '../../services/host.service';
import { env } from '../../config';
import { settingsRepo } from '../../database/repositories/settings.repo';
import {
  isFlutterwaveTestSecretKey,
  isValidFlutterwaveSecretKey,
} from '../../utils/flutterwave';
import {
  clubkonnectCredentialSource,
  clubkonnectCredentialStatus,
  removeClubkonnectCredentials,
  setClubkonnectCredentials,
} from '../../services/clubkonnect.service';
import {
  effectiveFreeFireApiKey,
  removeRuntimeFreeFireApiKey,
  setRuntimeFreeFireApiKey,
} from '../../services/freefire.service';
import { flushMongo, isMongoEnabled } from '../../database/mongo';

/**
 * Owner command to set AI provider API keys at runtime — no host dashboard,
 * no redeploy. Keys are persisted in the local JSON store and take effect
 * immediately (a `.setkey` value always wins over the env variable).
 *
 * Usage:
 *   .setkey <provider> <key>   e.g. .setkey gemini AIzaSy...
 *   .setkey list               show all providers (keys masked)
 *   .setkey remove <provider>  clear a stored key
 */

/** Usual key prefixes — soft warnings only, never hard rejections. */
const KEY_PREFIX: Record<string, string[]> = {
  // Google issues both classic AIza... and new AQ.... format keys.
  gemini: ['AIza', 'AQ.'],
  deepseek: ['sk-'],
  openrouter: ['sk-or-'],
  groq: ['gsk_'],
  openai: ['sk-'],
  // VTU (Flutterwave) — merchant mode for data/airtime sales.
  flutterwave: ['FLWSECK'],
};

async function runtimePersistence(): Promise<{ ok: boolean; line: string }> {
  if (!isMongoEnabled()) {
    return {
      ok: true,
      line: '⚠️ Saved locally only. Configure a working *MONGO_URI* before redeploying.',
    };
  }
  try {
    await flushMongo();
    return {
      ok: true,
      line: '💾 Saved durably to *MongoDB* — it will survive restarts and redeploys.',
    };
  } catch {
    return {
      ok: false,
      line: '❌ MongoDB persistence failed. The value may work in this process but is *not confirmed redeploy-safe*. Fix MongoDB and save it again.',
    };
  }
}

const HELP = [
  '🔑 *VENOM AI — Key Manager* (owner only)',
  '',
  '*Usage:*',
  '• `.setkey <provider> <key>` — set a key',
  '• `.setkey list` — show providers (masked)',
  '• `.setkey remove <provider>` — remove a stored key',
  '',
  '*Providers:* deepseek · gemini · openrouter · groq · openai · freefire (profile lookup) · flutterwave (collections) · clubkonnect (data)',
  '',
  '_Example:_ `.setkey gemini AIzaSyD...`',
  '_Takes effect immediately. Runtime keys override env vars._',
].join('\n');

const setkey: Command = {
  name: 'setkey',
  aliases: ['apikey', 'aikey'],
  category: 'config',
  description: 'Set AI provider keys at runtime (owner only).',
  usage: 'setkey <provider> <key> | setkey list | setkey remove <provider>',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const rawSub = (args[0] ?? '').toLowerCase();
    const sub = rawSub === 'clubconnect' ? 'clubkonnect' : rawSub;

    if (!sub) {
      await reply(sock, msg, HELP);
      return;
    }

    // ── .setkey list ─────────────────────────────────────────
    if (sub === 'list' || sub === 'status') {
      const active = configuredProviders();
      const lines = [
        '🔑 *VENOM AI — Keys*',
        '',
        ...AI_PROVIDER_NAMES.map((p) => {
          const runtime = getRuntimeAIKey(p);
          if (runtime) return `🔑 ${p} — ${maskKey(runtime)} *(runtime)*`;
          if (active.includes(p)) return `🟢 ${p} — *(from env)*`;
          return `⚪ ${p} — no key`;
        }),
        '',
        `🔁 Fallback order: ${env.ai.order.join(' → ')}`,
        `✅ Active: ${active.length ? active.join(' → ') : 'none yet'}`,
        '',
        `💳 Flutterwave (collections): ${
          settingsRepo.get('vtu.flwsecret')
            ? '🟢 key set'
            : env.vtu.flwSecret
              ? '🟢 from env'
              : '⚪ no key'
        }`,
        `📶 ClubKonnect (data): ${
          clubkonnectCredentialStatus() === 'configured'
            ? `🟢 credentials set (${clubkonnectCredentialSource()})`
            : '⚪ no credentials'
        }`,
        `🎮 Free Fire profile lookup: ${
          settingsRepo.get('api.key.freefire')
            ? '🟢 key set (runtime)'
            : effectiveFreeFireApiKey()
              ? '🟢 from env'
              : '⚪ no key'
        }`,
        '',
        '_Set one with_ `.setkey <provider> <key>`',
      ];
      await reply(sock, msg, lines.join('\n'));
      return;
    }

    // ── .setkey remove <provider> ────────────────────────────
    if (sub === 'remove' || sub === 'delete' || sub === 'del') {
      const provider = (args[1] ?? '').toLowerCase();

      if (provider === 'clubkonnect' || provider === 'clubconnect') {
        const had = removeClubkonnectCredentials();
        const fallback = clubkonnectCredentialSource();
        const persistence = had ? await runtimePersistence() : undefined;
        const result = had
          ? fallback === 'environment'
            ? '🗑️ Removed the runtime *ClubKonnect* credentials. Environment credentials are still active.'
            : '🗑️ Removed the *ClubKonnect* credentials. Data fulfilment falls back to Flutterwave if configured.'
          : fallback === 'environment'
            ? 'ℹ️ ClubKonnect is configured through environment variables; there is no runtime copy to remove.'
            : 'ℹ️ No ClubKonnect credentials were stored.';
        await reply(sock, msg, [result, persistence?.line].filter(Boolean).join('\n'));
        return;
      }

      // VTU (Flutterwave) — stored under its own settings key.
      if (provider === 'flutterwave') {
        const had = Boolean(settingsRepo.get('vtu.flwsecret'));
        settingsRepo.set('vtu.flwsecret', '');
        const persistence = had ? await runtimePersistence() : undefined;
        await reply(
          sock,
          msg,
          [
            had
              ? '🗑️ Removed the *Flutterwave* key. VTU sales are now off (unless FLW_SECRET_KEY is set in env).'
              : 'ℹ️ No Flutterwave key was stored.',
            persistence?.line,
          ].filter(Boolean).join('\n'),
        );
        return;
      }
      if (provider === 'freefire') {
        const had = removeRuntimeFreeFireApiKey();
        const persistence = had ? await runtimePersistence() : undefined;
        await reply(
          sock,
          msg,
          [
            had
              ? '🗑️ Removed the runtime *Free Fire* profile key. The environment key or keyless fallback may still be used.'
              : 'ℹ️ No runtime Free Fire key was stored.',
            persistence?.line,
          ].filter(Boolean).join('\n'),
        );
        return;
      }
      if (!AI_PROVIDER_NAMES.includes(provider)) {
        await reply(
          sock,
          msg,
          `❌ Unknown provider *${provider || '?'}*.\nUse: ${AI_PROVIDER_NAMES.join(' · ')}`,
        );
        return;
      }
      if (removeRuntimeAIKey(provider)) {
        const persistence = await runtimePersistence();
        await reply(
          sock,
          msg,
          `🗑️ Removed stored *${provider}* key.\n${
            configuredProviders().includes(provider)
              ? '↩️ Falling back to the env variable key.'
              : '⚪ No env key either — provider is now inactive.'
          }\n${persistence.line}`,
        );
      } else {
        await reply(
          sock,
          msg,
          `ℹ️ No runtime key stored for *${provider}* ${
            configuredProviders().includes(provider) ? '(its key comes from env).' : '.'
          }`,
        );
      }
      return;
    }

    // ── .setkey <provider> model <model-name> ────────────────
    if ((args[1] ?? '').toLowerCase() === 'model') {
      const provider = sub;
      if (!AI_PROVIDER_NAMES.includes(provider)) {
        await reply(
          sock,
          msg,
          `❌ Unknown provider *${provider}*.\nUse: ${AI_PROVIDER_NAMES.join(' · ')}`,
        );
        return;
      }
      const model = args.slice(2).join(' ').trim();
      if (!model) {
        const current = getRuntimeAIModel(provider);
        await reply(
          sock,
          msg,
          `ℹ️ Usage: *setkey ${provider} model <model-name>*` +
            (current ? `\nCurrent: ${current}` : ''),
        );
        return;
      }
      setRuntimeAIModel(provider, model);
      const persistence = await runtimePersistence();
      await reply(
        sock,
        msg,
        `✅ *${provider}* model set → ${model}\n${persistence.line}\nTest with *.ai hello*`,
      );
      return;
    }

    // ── .setkey <provider> <key> ─────────────────────────────
    const provider = sub;

    if (
      (provider === 'clubkonnect' ||
        provider === 'flutterwave' ||
        provider === 'freefire' ||
        AI_PROVIDER_NAMES.includes(provider)) &&
      msg.isGroup
    ) {
      try {
        await sock.sendMessage(msg.chat, { delete: msg.raw.key });
      } catch {
        /* best-effort removal of the credential-bearing message */
      }
      await reply(sock, msg, '🔒 Send API/payment credentials only in my private DM, never in a group.');
      return;
    }

    // Dedicated VTU fulfilment. Keep both values in one private DM command:
    // .setkey clubkonnect CK123|APIKEY
    if (provider === 'clubkonnect') {
      try {
        await sock.sendMessage(msg.chat, { delete: msg.raw.key });
      } catch {
        /* non-fatal */
      }
      const joined = args.slice(1).join('').trim();
      const [userId = '', apiKey = '', ...extra] = joined.split('|').map((part) => part.trim());
      if (
        extra.length ||
        !/^CK\d+$/i.test(userId) ||
        !/^[A-Za-z0-9]{20,}$/.test(apiKey)
      ) {
        await reply(
          sock,
          msg,
          'ℹ️ Usage in my private DM: *setkey clubkonnect USERID|APIKEY*\n\nExample: _.setkey clubkonnect CK123456|YOURKEY_\nDo not add spaces, a full stop, or other text.',
        );
        return;
      }
      setClubkonnectCredentials(userId.toUpperCase(), apiKey);
      const persistence = await runtimePersistence();

      await reply(
        sock,
        msg,
        `✅ *ClubKonnect* is active as the primary data provider.\n${persistence.line}\n\nRun *.vtu check*, then *.data mtn*.\n_Never post the API key in a group or public chat._`,
      );
      return;
    }

    // VTU (Flutterwave) collection/legacy merchant mode — the deployer's own
    // payment account. Stored under 'vtu.flwsecret'; never hardcoded.
    if (provider === 'flutterwave') {
      try {
        await sock.sendMessage(msg.chat, { delete: msg.raw.key });
      } catch {
        /* non-fatal */
      }
      const key = (args[1] ?? '').trim();
      if (!key || args.length > 2) {
        await reply(sock, msg, 'ℹ️ Usage: *setkey flutterwave FLWSECK-xxxxxxxx-X*');
        return;
      }
      if (!isValidFlutterwaveSecretKey(key)) {
        await reply(
          sock,
          msg,
          '⚠️ That Flutterwave secret key looks malformed. Paste only the key: it must begin with *FLWSECK-* (or *FLWSECK_TEST-*) and end with *-X*. Do not add a full stop or other text.',
        );
        return;
      }
      settingsRepo.set('vtu.flwsecret', key);
      const persistence = await runtimePersistence();

      const keyMode = isFlutterwaveTestSecretKey(key) ? 'TEST' : 'LIVE';
      await reply(
        sock,
        msg,
        `✅ *Flutterwave* ${keyMode} key is active for bank-transfer collection.\n${persistence.line}\n\n` +
          'Run *.vtu check* first, then use *.fund 500* to create a bank-transfer checkout.\n\n' +
          '_Never post this secret key in a group or public chat._',
      );
      return;
    }

    if (provider === 'freefire') {
      try {
        await sock.sendMessage(msg.chat, { delete: msg.raw.key });
      } catch {
        /* best-effort credential cleanup */
      }
      const key = (args[1] ?? '').trim();
      if (!key || args.length > 2 || key.length < 16) {
        await reply(sock, msg, 'ℹ️ Usage in my private DM: *setkey freefire YOUR_API_KEY*');
        return;
      }
      setRuntimeFreeFireApiKey(key);
      const persistence = await runtimePersistence();
      await reply(
        sock,
        msg,
        `✅ Free Fire profile lookup key is active.\n${persistence.line}\nTest with *.ffprofile UID REGION*.`,
      );
      return;
    }

    if (!AI_PROVIDER_NAMES.includes(provider)) {
      await reply(
        sock,
        msg,
        `❌ Unknown provider *${provider}*.\nUse: ${[...AI_PROVIDER_NAMES, 'freefire', 'flutterwave', 'clubkonnect'].join(' · ')}`,
      );
      return;
    }

    const key = args[1] ?? '';
    if (!key) {
      await reply(sock, msg, `ℹ️ Usage: *setkey ${provider} <your-api-key>*`);
      return;
    }
    if (args.length > 2) {
      await reply(
        sock,
        msg,
        '❌ The key looks wrong (it contains spaces).\nPaste the key exactly as copied — no spaces, no extra text.',
      );
      return;
    }
    if (key.length < 20) {
      await reply(sock, msg, '❌ That looks too short to be an API key. Please check and retry.');
      return;
    }

    const expected = KEY_PREFIX[provider];
    const prefixWarn =
      expected && !expected.some((p) => key.startsWith(p))
        ? `\n⚠️ Heads-up: ${provider} keys usually start with *${expected.join('* or *')}* — double-check it.`
        : '';

    setRuntimeAIKey(provider, key);
    const persistence = await runtimePersistence();

    // Best-effort: delete the owner's message so the raw key doesn't linger.
    let deleted = true;
    try {
      await sock.sendMessage(msg.chat, { delete: msg.raw.key });
    } catch {
      deleted = false;
    }

    // ── Persist to the host platform so it survives redeploys ──────
    // Local save (above) is instant; the host save (Render) makes it
    // permanent across redeploys/commits but triggers a short restart.
    let hostLine: string;
    const envName = envKeyNameFor(provider);
    if (hostPersistenceEnabled() && envName) {
      await reply(
        sock,
        msg,
        `💾 Saving *${provider}* key permanently to ${hostProviderName()}…`,
      );
      const result = await saveHostEnvVar(envName, key);
      if (result.ok) {
        hostLine =
          `🔒 *Saved permanently to ${result.provider}* — it will survive redeploys & new commits.` +
          (result.willRestart
            ? `\n♻️ The bot will restart in ~1-2 min to apply it. That's normal — it'll come back online automatically.`
            : '');
      } else if (result.error === 'invalid RENDER_API_KEY') {
        hostLine =
          `⚠️ Could not save to the host: *invalid RENDER_API_KEY*. The key still works now (saved locally), but set a valid RENDER_API_KEY to make it survive redeploys.`;
      } else if (result.error === 'RENDER_SERVICE_ID not found') {
        hostLine =
          `⚠️ Could not save to the host: *RENDER_SERVICE_ID not found*. Check the srv-xxxx id. Key still works now (saved locally).`;
      } else {
        hostLine =
          `⚠️ Host save failed (${result.error || 'unknown'}). The key still works now (saved locally) but may not survive a redeploy.`;
      }
    } else {
      hostLine = isMongoEnabled()
        ? 'ℹ️ Host environment sync is optional because MongoDB runtime-key persistence is configured.'
        : 'ℹ️ _Tip:_ configure *MONGO_URI* (preferred) or host environment sync before redeploying.';
    }

    await reply(
      sock,
      msg,
      [
        `✅ *${provider}* key is active — ${maskKey(key)}`,
        '⚡ Takes effect immediately.',
        persistence.line,
        deleted
          ? '🧹 Your message with the key was auto-deleted.'
          : '⚠️ I could not delete your message — please delete it, it contains the key!',
        hostLine,
        'Verify with *.aistatus* or test with *.ai hello*',
        prefixWarn,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  },
};

export default setkey;
