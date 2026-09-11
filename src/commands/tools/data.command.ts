import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { listBundles, vtuUnavailable, naira, Network } from '../../services/vtu.service';

/**
 * Browse data bundles with prices (Flutterwave NG catalog + owner margin).
 *   .data            → all networks summary
 *   .data mtn        → MTN bundles with buy codes
 * Networks: mtn · glo · airtel · 9mobile
 */
const dataCmd: Command = {
  name: 'data',
  aliases: ['bundles', 'databundles'],
  category: 'tools',
  description: 'Browse data bundle prices (MTN, Glo, Airtel, 9mobile).',
  usage: 'data [mtn | glo | airtel | 9mobile]',
  async run({ sock, msg, args }) {
    if (vtuUnavailable()) {
      await reply(sock, msg, vtuUnavailable()!);
      return;
    }

    const net = (args[0] ?? '').toLowerCase();
    const NETWORKS: Record<string, Network> = {
      mtn: 'MTN',
      glo: 'Glo',
      airtel: 'Airtel',
      '9mobile': '9mobile',
      etisalat: '9mobile',
    };
    const network = NETWORKS[net] as Network | undefined;

    try {
      if (!network) {
        const all = await listBundles();
        const byNet = new Map<Network, number>();
        for (const b of all) byNet.set(b.network, (byNet.get(b.network) ?? 0) + 1);
        const lines = [...byNet.entries()].map(
          ([n, count]) => `• *${n}* — ${count} bundles → _.data ${n.toLowerCase()}_`,
        );
        await reply(
          sock,
          msg,
          `📶 *Data Bundles — all networks*\n\n${lines.join('\n')}\n\n_Buy: .buydata <network> <code> <phone>_`,
        );
        return;
      }

      const bundles = await listBundles(network);
      if (!bundles.length) {
        await reply(sock, msg, `😔 No ${network} bundles available right now — try again shortly.`);
        return;
      }
      const lines = bundles
        .slice(0, 20)
        .map((b, i) => `${i + 1}. ${b.flwName} — *${naira(b.priceKobo)}*`);
      await reply(
        sock,
        msg,
        `📶 *${network} Data Bundles*\n\n${lines.join('\n')}\n\n` +
          `💳 *Buy:* _.buydata ${net} <code> [phone]_\n` +
          `_Wallet holders pay instantly; no wallet → payment link._\n`.trim() +
          (bundles.length > 20 ? `\n_…and ${bundles.length - 20} more (bigger plans)._` : ''),
      );
    } catch (err) {
      await reply(sock, msg, `❌ Could not load bundles (${(err as Error).message.slice(0, 80)}). Try again shortly.`);
    }
  },
};

export default dataCmd;
