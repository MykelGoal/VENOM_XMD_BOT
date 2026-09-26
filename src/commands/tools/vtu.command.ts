import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { isSudo } from '../../middleware/permission';
import {
  vtuMode,
  flwBalance,
  flwSecretKey,
  fulfilmentProvider,
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
import { clubkonnectBalance } from '../../services/clubkonnect.service';

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
      const provider = fulfilmentProvider();
      let providerBalance = 'unavailable';
      if (provider === 'clubkonnect') {
        try {
          providerBalance = `₦${(await clubkonnectBalance()).toLocaleString('en-NG')}`;
        } catch {
          // The full sanitized reason is available through .vtu check.
        }
      } else {
        providerBalance = await flwBalance();
      }
      const collectionKey = flwSecretKey();
      modeLine =
        `🟢 *Merchant mode* — data: *${provider === 'clubkonnect' ? 'ClubKonnect' : 'Flutterwave'}* (${providerBalance})\n` +
        `🏦 Bank-transfer collection: ${
          collectionKey
            ? isFlutterwaveTestSecretKey(collectionKey)
              ? 'Flutterwave TEST key'
              : `${maskKey(collectionKey)} (LIVE)`
            : 'not configured — wallet purchases only'
        }`;
    } else if (mode === 'gateway') {
      modeLine = `🔵 *Gateway mode* — ${env.vtu.gatewayUrl}\n🚧 _Phase B client never land yet — e go work once venom-gateway ships._`;
    } else {
      modeLine =
        '⚪ *OFF* — no fulfilment provider and no gateway.\n' +
        'Configure ClubKonnect privately with `.setkey clubkonnect USERID|APIKEY`';
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
        (isSudo(msg.senderNumber) ? '_Money tip: keep the active provider wallet funded; data sales carry your configured markup._' : ''),
    );
  },
};

export default vtuCmd;
