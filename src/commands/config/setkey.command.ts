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
};

const HELP = [
  '🔑 *VENOM AI — Key Manager* (owner only)',
  '',
  '*Usage:*',
  '• `.setkey <provider> <key>` — set a key',
  '• `.setkey list` — show providers (masked)',
  '• `.setkey remove <provider>` — remove a stored key',
  '',
  '*Providers:* deepseek · gemini · openrouter · groq · openai',
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
    const sub = (args[0] ?? '').toLowerCase();

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
        '_Set one with_ `.setkey <provider> <key>`',
      ];
      await reply(sock, msg, lines.join('\n'));
      return;
    }

    // ── .setkey remove <provider> ────────────────────────────
    if (sub === 'remove' || sub === 'delete' || sub === 'del') {
      const provider = (args[1] ?? '').toLowerCase();
      if (!AI_PROVIDER_NAMES.includes(provider)) {
        await reply(
          sock,
          msg,
          `❌ Unknown provider *${provider || '?'}*.\nUse: ${AI_PROVIDER_NAMES.join(' · ')}`,
        );
        return;
      }
      if (removeRuntimeAIKey(provider)) {
        await reply(
          sock,
          msg,
          `🗑️ Removed stored *${provider}* key.\n${
            configuredProviders().includes(provider)
              ? '↩️ Falling back to the env variable key.'
              : '⚪ No env key either — provider is now inactive.'
          }`,
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
      await reply(
        sock,
        msg,
        `✅ *${provider}* model set → ${model}\nTest with *.ai hello*`,
      );
      return;
    }

    // ── .setkey <provider> <key> ─────────────────────────────
    const provider = sub;
    if (!AI_PROVIDER_NAMES.includes(provider)) {
      await reply(
        sock,
        msg,
        `❌ Unknown provider *${provider}*.\nUse: ${AI_PROVIDER_NAMES.join(' · ')}`,
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
    let hostLine = '';
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
      hostLine =
        `ℹ️ _Tip:_ to make keys survive redeploys, set *RENDER_API_KEY* + *RENDER_SERVICE_ID* on your host. (Right now this key is saved locally and works until the next redeploy.)`;
    }

    await reply(
      sock,
      msg,
      [
        `✅ *${provider}* key saved — ${maskKey(key)}`,
        '⚡ Takes effect immediately.',
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
