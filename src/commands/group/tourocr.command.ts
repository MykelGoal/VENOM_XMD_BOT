import type { Command } from '../../types/command.type';
import { settingsRepo } from '../../database/repositories/settings.repo';
import { flushMongo, isMongoEnabled } from '../../database/mongo';
import { isVisionConfigured } from '../../services/ai.service';
import { reply } from '../../services/message.service';

const KEY = 'tournament.receipt.ocr';

const tourocr: Command = {
  name: 'tourocr',
  category: 'group',
  description: 'Owner opt-in for non-authoritative receipt OCR.',
  usage: 'tourocr on|off|status',
  ownerOnly: true,
  async run({ sock, msg, args, prefix }) {
    const action = (args[0] ?? 'status').toLowerCase();
    if (action === 'status') {
      await reply(
        sock,
        msg,
        [
          `🧾 Receipt OCR: *${settingsRepo.getBool(KEY, false) ? 'ON' : 'OFF'}*`,
          `Vision provider: *${isVisionConfigured() ? 'configured' : 'not configured'}*`,
          `Storage: *${isMongoEnabled() ? 'MongoDB' : 'local only ⚠️'}*`,
          '_OCR is only reading assistance. It never confirms settlement or approves a player._',
        ].join('\n'),
      );
      return;
    }
    if (!['on', 'off'].includes(action)) {
      await reply(sock, msg, `ℹ️ Usage: *${prefix}tourocr on|off|status*`);
      return;
    }
    if (action === 'on' && !isVisionConfigured()) {
      await reply(sock, msg, '❌ Configure a vision-capable Gemini/OpenAI key first.');
      return;
    }
    settingsRepo.setBool(KEY, action === 'on');
    try {
      await flushMongo();
    } catch {
      await reply(sock, msg, '❌ The OCR setting changed in this process, but MongoDB persistence failed. Fix storage and set it again.');
      return;
    }
    await reply(
      sock,
      msg,
      (action === 'on'
        ? '✅ Receipt OCR assistance is on. Receipt images may be sent to the configured vision provider; output is masked, bounded and never treated as payment proof.'
        : '✅ Receipt OCR is off. Receipts are still forwarded privately to the owner for manual bank verification.') +
        (isMongoEnabled() ? '\n💾 Saved durably to MongoDB.' : '\n⚠️ Saved locally only; configure MongoDB before redeploying.'),
    );
  },
};

export default tourocr;
