import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';

/**
 * .ffredeem — reliable guide to redeeming Free Fire codes.
 * Deliberately does NOT list live codes (no reliable source exists and codes
 * are region-locked + expire in ~24h). Instead it gives the official link,
 * clear steps, and where to find today's fresh codes — never stale, never wrong.
 */
const ffredeem: Command = {
  name: 'ffredeem',
  aliases: ['redeem', 'ffcode', 'ffcodes', 'redeemcode'],
  category: 'game',
  description: 'How to redeem Free Fire codes (official link + steps).',
  usage: 'ffredeem',
  async run({ sock, msg }) {
    await react(sock, msg, '🎁');

    const text = [
      '🎁 *Free Fire — Redeem Codes Guide*',
      '━━━━━━━━━━━━━━━',
      '',
      '🔗 *Official site:*',
      'https://reward.ff.garena.com',
      '',
      '*How to redeem:*',
      '1️⃣ Open the link above',
      '2️⃣ Log in with the SAME platform as your FF account (Facebook, Google, VK, X, etc.)',
      '3️⃣ Paste the 12–16 char code',
      '4️⃣ Tap *Confirm* → rewards arrive in-game *Mail* within ~30 min',
      '',
      '⚠️ *Important:*',
      '• Codes are *region-locked* — an India code won’t work on MENA/Brazil/etc.',
      '• Most codes *expire in ~24 hours*.',
      '• Guest accounts *can’t* redeem — bind to a platform first.',
      '',
      '🔎 *Where to get today’s fresh codes:*',
      '• Official FF social pages & in-game events',
      '• Search “Free Fire redeem code today” + your region',
      '',
      '_VENOM won’t list codes here — they change daily & by region, and posting old ones would waste your time. This guide always works. 🕷️_',
    ].join('\n');

    await react(sock, msg, '✅');
    await reply(sock, msg, text);
  },
};

export default ffredeem;
