import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { settingsRepo } from '../../database/repositories/settings.repo';

/**
 * Bot mode: "public" (everyone can use) or "private" (owner/sudo only).
 * The command handler reads this setting to gate usage.
 */
const mode: Command = {
  name: 'mode',
  category: 'config',
  description: 'Set bot mode to public or private.',
  usage: 'mode <public|private>',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const m = args[0]?.toLowerCase();
    if (m !== 'public' && m !== 'private') {
      const current = settingsRepo.get('mode') ?? 'public';
      await reply(sock, msg, `ℹ️ Current mode: *${current}*.\nUsage: *mode public* / *mode private*`);
      return;
    }
    settingsRepo.set('mode', m);
    await reply(sock, msg, `✅ Bot mode set to *${m}*.`);
  },
};

export default mode;
