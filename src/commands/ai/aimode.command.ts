import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { settingsRepo } from '../../database/repositories/settings.repo';
import { isAIConfigured } from '../../services/ai.service';

/**
 * AI mode: make the bot auto-reply with AI to normal messages (no command).
 *   .aimode on   → auto-reply in DMs only (safe default)
 *   .aimode all  → auto-reply EVERYWHERE, including groups (⚠️ noisy)
 *   .aimode off  → disable (only responds to .ai and other commands)
 */
const aimode: Command = {
  name: 'aimode',
  aliases: ['chatbot', 'autoai', 'aichat'],
  category: 'ai',
  description: 'Auto-reply with AI to normal messages (no command needed).',
  usage: 'aimode on | all | off',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const arg = args[0]?.toLowerCase();
    const current = settingsRepo.get('aimode') || 'off';

    if (!arg) {
      await reply(
        sock,
        msg,
        `🤖 *AI mode* is currently *${current.toUpperCase()}*.\n\n` +
          '• *aimode on* — auto-reply in DMs only\n' +
          '• *aimode all* — auto-reply everywhere (incl. groups) ⚠️\n' +
          '• *aimode off* — disable',
      );
      return;
    }

    // Accept friendly synonyms.
    const map: Record<string, 'off' | 'dm' | 'all'> = {
      off: 'off',
      no: 'off',
      disable: 'off',
      on: 'dm',
      dm: 'dm',
      dms: 'dm',
      private: 'dm',
      all: 'all',
      everywhere: 'all',
      group: 'all',
      groups: 'all',
    };
    const mode = map[arg];
    if (!mode) {
      await reply(sock, msg, 'ℹ️ Usage: *aimode on | all | off*');
      return;
    }

    settingsRepo.set('aimode', mode);

    if (mode !== 'off' && !isAIConfigured()) {
      await reply(
        sock,
        msg,
        `⚠️ AI mode set to *${mode.toUpperCase()}*, but no AI key is configured yet.\n` +
          'Add one with *.setkey groq <key>* (or set it in your host env).',
      );
      return;
    }

    const label =
      mode === 'off'
        ? 'OFF — I only respond to commands now.'
        : mode === 'dm'
          ? 'ON (DMs only) — I now reply to normal messages in private chats.'
          : 'ALL — I now reply to normal messages *everywhere, including groups*. ⚠️ This can get noisy.';

    await reply(sock, msg, `✅ AI mode: *${label}*`);
  },
};

export default aimode;
