/**
 * AI 2.0 — the AI's HANDS.
 *
 * Turns the bot's own features into tools the AI can call mid-conversation:
 * "play duduke by Simi" → the AI runs .play itself; "buy MTN 1GB" → the AI
 * proposes the exact bundle and waits for the user's "yes".
 *
 * Safety rules (non-negotiable):
 *   • MONEY never moves on the AI's word alone — buy_data / buy_airtime only
 *     create a PROPOSAL. The user must reply a plain "yes", which is matched
 *     by deterministic code (below), never by the model.
 *   • run_command can only reach an allowlist: no owner/admin/group commands,
 *     no config, no AI-recursion, and never the VTU commands themselves
 *     (they are tool-gated so the confirm flow can't be bypassed).
 *   • Cooldowns still apply to AI-triggered commands.
 */
import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import type { Command } from '../types/command.type';
import { commands } from '../commands';
import { checkCooldown } from '../middleware/cooldown';
import { reply } from './message.service';
import { env } from '../config';
import { logger } from '../utils/logger';
import type { ToolDef, ToolExecutor } from './ai.service';
import {
  vtuMode,
  vtuUnavailable,
  listBundles,
  normalizePhone,
  naira,
  initFund,
  initDirectBuy,
  purchaseWithWallet,
  buyAirtime,
  walletRepo,
} from './vtu.service';
import type { Network, Bundle } from './vtu.service';

/* ────────────────────────── command allowlist ────────────────────────── */

/** Whole categories the AI must never touch. */
const BLOCKED_CATEGORIES = new Set(['owner', 'config', 'group', 'ai']);
/** Individual commands the AI must never run (VTU goes through typed tools). */
const BLOCKED_COMMANDS = new Set([
  'ai', 'menu', 'help', 'all', 'setkey', 'vtu',
  'data', 'buydata', 'airtime', 'fund', 'wallet',
]);

/** True when a command is safe for the AI to run via run_command. */
export function isAIRunnable(cmd: Command): boolean {
  return (
    !cmd.ownerOnly &&
    !cmd.adminOnly &&
    !cmd.groupOnly &&
    !BLOCKED_CATEGORIES.has(cmd.category) &&
    !BLOCKED_COMMANDS.has(cmd.name)
  );
}

let allowlistSummary: string | null = null;

/** Compact "what can I run" summary for the run_command tool description. */
function runnableCommandSummary(): string {
  if (allowlistSummary) return allowlistSummary;
  const byCat = new Map<string, string[]>();
  for (const cmd of commands.values()) {
    if (!isAIRunnable(cmd)) continue;
    (byCat.get(cmd.category) ?? byCat.set(cmd.category, []).get(cmd.category)!).push(cmd.name);
  }
  const lines = [...byCat.entries()].map(([cat, names]) => `${cat}: ${names.join(', ')}`);
  allowlistSummary = lines.join('\n');
  return allowlistSummary;
}

/* ──────────────────── purchase confirm gate (money safety) ───────────── */

export interface PurchaseIntent {
  kind: 'data' | 'airtime';
  /** Wallet owner (the proposer's number). */
  number: string;
  /** Chat the proposal was made in — confirmation must come from there. */
  chat: string;
  /** Delivery phone. */
  phone: string;
  /** Data only. */
  bundleId?: number;
  network?: Network;
  bundleLabel?: string;
  priceKobo?: number;
  /** Airtime only (face value). */
  amountNaira?: number;
  createdAt: number;
}

const INTENT_TTL_MS = 3 * 60_000;
const pendingIntents = new Map<string, PurchaseIntent>(); // key: sender number

/** The user's open purchase proposal, or null when none / expired. */
export function getPendingIntent(number: string): PurchaseIntent | null {
  const intent = pendingIntents.get(number);
  if (!intent) return null;
  if (Date.now() - intent.createdAt > INTENT_TTL_MS) {
    pendingIntents.delete(number);
    return null;
  }
  return intent;
}

export function clearPendingIntent(number: string): void {
  pendingIntents.delete(number);
}

const CONFIRM_ALL =
  /\b(yes|yeah|yep|yhh|confirm(?:ed)?|ok(?:ay)?|k|sure|proceed|go ahead|go on|do it|do am|buy it|buy am|yes na|continue|jare|abeg|please|pls|now|go)\b/gi;
const CONFIRM_TEST =
  /\b(yes|yeah|yep|yhh|confirm(?:ed)?|ok(?:ay)?|k|sure|proceed|go ahead|go on|do it|do am|buy it|buy am|yes na|continue)\b/i;
const DENY_TEST =
  /\b(no|nope|nah|cancel|stop|forget it|later|nvm|never ?mind|no thanks|don'?t|abeg no)\b/i;

/**
 * True when a short message is (only) a purchase confirmation.
 * "yes", "yes buy am jare" → true; "yes but make it 2GB" → false (goes back
 * to the AI, which re-proposes the right bundle).
 */
export function isConfirmText(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (t.length > 40 || !CONFIRM_TEST.test(t) || DENY_TEST.test(t)) return false;
  const leftover = t.replace(CONFIRM_ALL, '').replace(/[^a-z0-9]/g, '');
  return leftover.length <= 4;
}

/** True when the user is cancelling a proposal. */
export function isDenyText(text: string): boolean {
  return DENY_TEST.test(text);
}

/* ────────────────────────── bundle matching ────────────────────────── */

/** "1GB" → 1024, "500MB" → 500 (null when the text has no size). */
function sizeMb(text: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*(gb|mb)/i.exec(text);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return m[2].toLowerCase() === 'gb' ? v * 1024 : v;
}

/** Best bundle for a user's description ("1gb", "500mb", "monthly 2gb"). */
export function matchBundle(bundles: Bundle[], query: string): Bundle | null {
  const want = sizeMb(query);
  if (want != null) {
    const sized = bundles
      .map((b) => ({ b, mb: sizeMb(b.flwName) }))
      .filter((x): x is { b: Bundle; mb: number } => x.mb != null)
      .sort((a, b) => a.mb - b.mb);
    const exact = sized.find((x) => Math.abs(x.mb - want) < 1);
    if (exact) return exact.b;
    const above = sized.find((x) => x.mb >= want); // smallest bundle ≥ wanted
    if (above) return above.b;
    return sized.length ? sized[sized.length - 1].b : null; // closest below
  }
  const q = query.toLowerCase().trim();
  return bundles.find((b) => b.flwName.toLowerCase().includes(q)) ?? null;
}

/* ────────────────────────── tool definitions ────────────────────────── */

/** Tools the AI gets for this message (VTU tools only in merchant mode). */
export function buildAITools(): ToolDef[] {
  const tools: ToolDef[] = [
    {
      name: 'run_command',
      description:
        "Run one of the bot's commands. The command's output (text, image, audio or video) is sent to the chat directly — afterwards briefly tell the user what you did. Use this when the user asks you to DO something: play a song, download a video, check the weather, make a sticker, etc.",
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'command name WITHOUT the dot prefix, e.g. "play"',
          },
          args: {
            type: 'string',
            description: 'the command arguments as one string, e.g. "duduke by Simi" (may be empty)',
          },
        },
        required: ['command'],
      },
    },
  ];

  if (vtuMode() === 'merchant') {
    tools.push(
      {
        name: 'check_wallet',
        description:
          "Check the user's Venom wallet balance and recent transactions. Read-only — always use this before quoting what they can afford.",
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'list_data_bundles',
        description:
          'List data bundles and prices for a network (MTN, Glo, Airtel, 9mobile). Read-only.',
        parameters: {
          type: 'object',
          properties: {
            network: {
              type: 'string',
              enum: ['MTN', 'Glo', 'Airtel', '9mobile'],
              description: 'omit to list a sample across all networks',
            },
          },
        },
      },
      {
        name: 'buy_data',
        description:
          'PROPOSE a data bundle purchase (e.g. user says "buy MTN 1GB for 0803…"). NEVER completes immediately: it returns a proposal with the exact price and the user must then reply "yes" in chat to confirm. Do not tell the user the purchase is done — ask for their confirmation.',
        parameters: {
          type: 'object',
          properties: {
            network: { type: 'string', enum: ['MTN', 'Glo', 'Airtel', '9mobile'] },
            bundle: {
              type: 'string',
              description: 'size or name, e.g. "1GB", "500MB", "2GB monthly"',
            },
            phone: {
              type: 'string',
              description: "delivery phone number — omit to use the user's own number",
            },
          },
          required: ['network', 'bundle'],
        },
      },
      {
        name: 'buy_airtime',
        description:
          'PROPOSE an airtime purchase at face value (₦50–₦20,000). NEVER completes immediately: returns a proposal the user must confirm with "yes" in chat.',
        parameters: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'naira amount, 50–20000' },
            phone: {
              type: 'string',
              description: "delivery phone number — omit to use the user's own number",
            },
          },
          required: ['amount'],
        },
      },
      {
        name: 'fund_wallet',
        description:
          "Create a Flutterwave payment link so the user can top up their wallet (card / bank transfer / USSD). The wallet credits automatically when payment clears. Safe to run directly — no money moves yet.",
        parameters: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'naira amount, 100–100000' },
          },
          required: ['amount'],
        },
      },
    );
  }
  return tools;
}

/** Extra system instructions injected whenever tools are active. */
export function aiToolsSystemPrompt(): string {
  const vtuOn = vtuMode() === 'merchant';
  return [
    '## YOUR TOOLS',
    'You can ACT, not just talk. When the user asks you to do something (play a song, check the weather, check their wallet, buy data), call the matching tool instead of telling them which command to type. After a tool runs, tell the user briefly what happened — never stay silent about an action you took.',
    'Commands you may run with run_command (name only, no dot):',
    runnableCommandSummary(),
    ...(vtuOn
      ? [
          '## MONEY RULES (strict)',
          '• buy_data and buy_airtime only create a PROPOSAL. Never say a purchase is done until the user confirms.',
          '• After proposing, tell the user the exact price and ask them to reply "yes" to buy or "no" to cancel. The bot handles the confirmation itself — you do not confirm purchases.',
          '• Never invent prices or balances — always read them from tool results.',
          '• If wallet balance is short, say so: the bot will send a payment link for the exact price on confirmation.',
        ]
      : []),
  ].join('\n');
}

/* ────────────────────────── executor ────────────────────────── */

/**
 * Builds the tool executor bound to the current message — tools reply and
 * send media into the same chat the user is talking in.
 */
export function buildToolExecutor(
  sock: WASocket,
  msg: SerializedMessage,
): ToolExecutor {
  return async (name, args): Promise<string> => {
    switch (name) {
      /* ── generic command runner ── */
      case 'run_command': {
        const raw = String(args.command ?? '').toLowerCase().replace(/^\.+/, '');
        const cmd =
          commands.get(raw) ??
          [...commands.values()].find((c) => c.aliases?.includes(raw));
        if (!cmd) return `ERROR: unknown command "${raw}".`;
        if (!isAIRunnable(cmd)) {
          return `ERROR: "${cmd.name}" is not available through the AI.`;
        }
        const remaining = checkCooldown(msg.senderNumber, cmd.name);
        if (remaining > 0) {
          return `"${cmd.name}" is on cooldown — the user can retry in ${remaining}s.`;
        }
        const argText = String(args.args ?? '').trim();
        try {
          await cmd.run({
            sock,
            msg,
            args: argText ? argText.split(/\s+/) : [],
            text: argText,
            prefix: env.prefix,
          });
          return `Command ".${cmd.name}${argText ? ' ' + argText : ''}" executed — its output went to the chat directly.`;
        } catch (err) {
          logger.warn({ err }, `AI run_command "${cmd.name}" failed`);
          return `ERROR running "${cmd.name}": ${(err as Error).message.slice(0, 120)}`;
        }
      }

      /* ── VTU: read-only ── */
      case 'check_wallet': {
        const bal = walletRepo.balance(msg.senderNumber);
        const hist = walletRepo
          .history(msg.senderNumber, 3)
          .map((h) => `${h.amountKobo >= 0 ? '+' : '−'}${naira(Math.abs(h.amountKobo))} ${h.kind}`)
          .join(', ');
        return `Wallet balance: ${naira(bal)}${hist ? `\nRecent: ${hist}` : ''}`;
      }

      case 'list_data_bundles': {
        const net = args.network as Network | undefined;
        const bundles = await listBundles(net);
        if (!bundles.length) return `No bundles found${net ? ` for ${net}` : ''} right now.`;
        const shown = bundles.slice(0, 15);
        const lines = shown.map(
          (b, i) => `${i + 1}. ${b.flwName} — ${naira(b.priceKobo)}`,
        );
        return (
          `Data bundles${net ? ` (${net})` : ''}:\n${lines.join('\n')}` +
          (bundles.length > shown.length ? `\n(+${bundles.length - shown.length} more)` : '')
        );
      }

      case 'fund_wallet': {
        const amount = Number(args.amount);
        if (!Number.isFinite(amount) || amount < 100 || amount > 100000) {
          return 'ERROR: amount must be between ₦100 and ₦100,000.';
        }
        try {
          const { link } = await initFund(msg.senderNumber, amount);
          return `Payment link created for ${naira(Math.round(amount * 100))}: ${link}\nTell the user to pay there — the wallet credits automatically.`;
        } catch (err) {
          return `ERROR creating payment link: ${(err as Error).message.slice(0, 120)}`;
        }
      }

      /* ── VTU: confirm-gated proposals ── */
      case 'buy_data': {
        const unavailable = vtuUnavailable();
        if (unavailable) return `VTU is off: ${unavailable}`;
        const network = String(args.network ?? '') as Network;
        const bundles = await listBundles(network);
        if (!bundles.length) return `No ${network} bundles are available right now.`;
        const bundle = matchBundle(bundles, String(args.bundle ?? ''));
        if (!bundle) {
          return `No ${network} bundle matches "${args.bundle}". Ask the user to be specific (e.g. "1GB") or list bundles with the list_data_bundles tool.`;
        }
        const phone = normalizePhone(String(args.phone ?? '')) || normalizePhone(msg.senderNumber) || msg.senderNumber;
        const balance = walletRepo.balance(msg.senderNumber);
        pendingIntents.set(msg.senderNumber, {
          kind: 'data',
          number: msg.senderNumber,
          chat: msg.chat,
          phone,
          bundleId: bundle.id,
          network: bundle.network,
          bundleLabel: bundle.flwName,
          priceKobo: bundle.priceKobo,
          createdAt: Date.now(),
        });
        return [
          'PROPOSAL CREATED — the purchase is NOT done yet. Tell the user:',
          `• Bundle: ${bundle.network} ${bundle.flwName}`,
          `• Price: ${naira(bundle.priceKobo)}`,
          `• Deliver to: ${phone}`,
          `• Their wallet balance: ${naira(balance)}`,
          balance >= bundle.priceKobo
            ? 'On their "yes" the bot buys instantly from the wallet.'
            : 'Balance is short — on their "yes" the bot sends a Flutterwave payment link for the exact price (data delivers automatically after payment).',
          'Ask them to reply "yes" to buy or "no" to cancel.',
        ].join('\n');
      }

      case 'buy_airtime': {
        const unavailable = vtuUnavailable();
        if (unavailable) return `VTU is off: ${unavailable}`;
        const amount = Math.round(Number(args.amount));
        if (!Number.isFinite(amount) || amount < 50 || amount > 20000) {
          return 'ERROR: airtime amount must be ₦50–₦20,000.';
        }
        const phone = normalizePhone(String(args.phone ?? '')) || normalizePhone(msg.senderNumber) || msg.senderNumber;
        const balance = walletRepo.balance(msg.senderNumber);
        pendingIntents.set(msg.senderNumber, {
          kind: 'airtime',
          number: msg.senderNumber,
          chat: msg.chat,
          phone,
          amountNaira: amount,
          createdAt: Date.now(),
        });
        return [
          'PROPOSAL CREATED — the purchase is NOT done yet. Tell the user:',
          `• Airtime: ${naira(amount * 100)} (face value)`,
          `• Deliver to: ${phone}`,
          `• Their wallet balance: ${naira(balance)}`,
          balance >= amount * 100
            ? 'On their "yes" the bot sends the airtime instantly from the wallet.'
            : 'Balance is short — tell them to top up with the fund_wallet tool first.',
          'Ask them to reply "yes" to buy or "no" to cancel.',
        ].join('\n');
      }

      default:
        return `ERROR: unknown tool "${name}".`;
    }
  };
}

/* ────────────────── deterministic confirmation handling ─────────────── */

/**
 * Executes a confirmed purchase intent (called ONLY from deterministic
 * confirm-word matching in the message handler — never by the model).
 */
export async function executePendingIntent(
  sock: WASocket,
  msg: SerializedMessage,
  intent: PurchaseIntent,
): Promise<void> {
  const unavailable = vtuUnavailable();
  if (unavailable) {
    await reply(sock, msg, `⚠️ VTU don deactivate — purchase no go through.\n${unavailable}`);
    return;
  }

  if (intent.kind === 'data') {
    const bundles = await listBundles(intent.network as Network);
    const bundle = bundles.find((b) => b.id === intent.bundleId);
    if (!bundle) {
      await reply(sock, msg, '⚠️ That bundle no dey available again — check the current list with *.data*.');
      return;
    }
    const res = await purchaseWithWallet(intent.number, bundle, intent.phone);
    if (res.ok) {
      await reply(
        sock,
        msg,
        `✅ *Confirmed — data delivered!*\n\n📶 ${bundle.network} • ${bundle.flwName}\n📞 ${intent.phone}\n💼 Balance: *${naira(walletRepo.balance(intent.number))}*\n\n🧾 Ref: ${res.txRef}`,
      );
      return;
    }
    if (res.error === 'INSUFFICIENT') {
      const { link } = await initDirectBuy(intent.number, bundle, intent.phone);
      await reply(
        sock,
        msg,
        `💡 Wallet balance no reach — pay the exact *${naira(bundle.priceKobo)}* here:\n\n${link}\n\n_Data go deliver automatically once payment clear._ 👀`,
      );
      return;
    }
    await reply(
      sock,
      msg,
      '⚠️ Network no gree deliver that one — any money wey leave your wallet don return. Try again small time.',
    );
    return;
  }

  // Airtime
  const amount = intent.amountNaira ?? 0;
  const res = await buyAirtime(intent.number, amount, intent.phone);
  if (res.ok) {
    await reply(
      sock,
      msg,
      `✅ *Confirmed — airtime sent!*\n\n📶 ${naira(amount * 100)} → ${intent.phone}\n💼 Balance: *${naira(walletRepo.balance(intent.number))}*\n\n🧾 Ref: ${res.txRef}`,
    );
    return;
  }
  if (res.error === 'INSUFFICIENT') {
    await reply(
      sock,
      msg,
      `💡 Your wallet balance no reach ${naira(amount * 100)}. Top up with *.fund* — then try again.`,
    );
    return;
  }
  await reply(sock, msg, '⚠️ Airtime no deliver — your wallet don refund. Try again small time.');
}

/**
 * Handles a plain (non-command) text message that may be confirming or
 * cancelling a pending AI purchase proposal. Returns true when the message
 * was consumed (confirm executed / cancel replied), false otherwise.
 * Works even when AI mode is off, so .ai users can confirm too.
 */
export async function handlePendingIntentMessage(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<boolean> {
  if (!msg.body || !msg.body.trim()) return false;
  const intent = getPendingIntent(msg.senderNumber);
  if (!intent) return false;
  if (intent.chat !== msg.chat) {
    clearPendingIntent(msg.senderNumber); // confirmed in a different chat — stale
    return false;
  }
  if (isDenyText(msg.body)) {
    clearPendingIntent(msg.senderNumber);
    void reply(sock, msg, '🚫 Purchase cancelled — nothing comot for your pocket. 🙂');
    return true;
  }
  if (isConfirmText(msg.body)) {
    clearPendingIntent(msg.senderNumber);
    await executePendingIntent(sock, msg, intent);
    return true;
  }
  // Unrelated text — the user moved on; drop the proposal.
  clearPendingIntent(msg.senderNumber);
  return false;
}
