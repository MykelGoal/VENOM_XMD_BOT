import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { isSudo } from '../../middleware/permission';
import {
  vtuMode,
  flwBalance,
  flwSecretKey,
  vtuDiagnostics,
  marginPct,
  setMarginPct,
  listBundles,
  walletRepo,
  naira,
} from '../../services/vtu.service';
import { maskKey } from '../../services/ai.service';
import { env } from '../../config';
import { isMongoEnabled } from '../../database/mongo';
import { isFlutterwaveTestSecretKey } from '../../utils/flutterwave';

/**
 * VTU owner panel — status, pricing margin, sales stats.
 *   .vtu             → mode, keys, Flutterwave balance, wallets, margin
 *   .vtu margin <n>  → set the data markup % (default 3)
 */
const vtuCmd: Command = {
  name: 'vtu',
  category: 'tools',
  description: 'VTU control panel (owner): status, margin, stats.',
  usage: 'vtu [check | margin <%>]',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'check' || subcommand === 'diagnose') {
      const lines = await vtuDiagnostics();
      await reply(sock, msg, ['🩺 *VTU diagnostics*', '', ...lines].join('\n'));
      return;
    }

    // margin subcommand
    if (subcommand === 'margin') {
      const pct = Number(args[1]);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        await reply(sock, msg, `ℹ️ Usage: *vtu margin <0-100>*\nCurrent: *${marginPct()}%*`);
        return;
      }
      setMarginPct(pct);
      await reply(
        sock,
        msg,
        `✅ Data markup set to *${pct}%* — prices for buyers don update (bundle list refresh within an hour).`,
      );
      return;
    }

    const mode = vtuMode();
    const stats = walletRepo.stats();
    let modeLine: string;
    if (mode === 'merchant') {
      const bal = await flwBalance();
      modeLine =
        `🟢 *Merchant mode* — Flutterwave balance: *${bal}*\n` +
        `🔑 Key: ${
          isFlutterwaveTestSecretKey(flwSecretKey())
            ? 'TEST key'
            : `${maskKey(flwSecretKey())} (LIVE)`
        }`;
    } else if (mode === 'gateway') {
      modeLine = `🔵 *Gateway mode* — ${env.vtu.gatewayUrl}\n🚧 _Phase B client never land yet — e go work once venom-gateway ships._`;
    } else {
      modeLine =
        '⚪ *OFF* — no Flutterwave key and no gateway.\n' +
        'Activate merchant mode with `.setkey flutterwave FLWSECK-…`';
    }

    let bundleCount: string;
    try {
      bundleCount = String((await listBundles()).length);
    } catch {
      bundleCount = 'unavailable';
    }

    await reply(
      sock,
      msg,
      `💳 *VTU Panel*\n\n${modeLine}\n\n` +
        `📶 Bundles loaded: ${bundleCount}\n` +
        `📈 Data markup: *${marginPct()}%* (change: .vtu margin 5)\n` +
        `💼 Wallets: ${stats.wallets} · Ledger entries: ${stats.entries}\n` +
        `🗄️ Storage: ${
          isMongoEnabled()
            ? '🟢 MongoDB — wallets survive redeploys'
            : '⚠️ local files — set MONGO_URI or wallets wipe on redeploy'
        }\n` +
        `🏦 Total user balances: ${naira(stats.totalBalanceKobo)}\n\n` +
        (isSudo(msg.senderNumber) ? '_Money tips: airtime sells at face value (Flutterwave commission covers fees); data carries your markup._' : ''),
    );
  },
};

export default vtuCmd;
