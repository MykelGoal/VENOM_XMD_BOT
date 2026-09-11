import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { settingsRepo } from '../../database/repositories/settings.repo';

/**
 * AI voice replies: control whether AI-mode answers are SPOKEN as voice
 * notes (free — no paid API needed; the chain is Edge TTS → Groq → Fish).
 *   .aivoice          → status
 *   .aivoice on       → voice-for-voice: speak only when spoken to via voice note (default)
 *   .aivoice all      → speak EVERY AI reply
 *   .aivoice off      → always reply as text
 * Long answers always stay text, and if all TTS providers fail the text
 * reply still goes out — the bot never goes silent.
 */
const aivoice: Command = {
  name: 'aivoice',
  aliases: ['aivoicemode'],
  category: 'ai',
  description: 'AI replies as spoken voice notes (voice-for-voice by default).',
  usage: 'aivoice on | all | off',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const arg = args[0]?.toLowerCase();
    const current = settingsRepo.get('aivoice') || 'voice';

    if (!arg) {
      await reply(
        sock,
        msg,
        `🎙️ *AI voice replies* are currently *${current.toUpperCase()}*.\n\n` +
          '• *aivoice on* — voice-for-voice: I answer voice notes with a voice note (default)\n' +
          '• *aivoice all* — I speak EVERY AI reply\n' +
          '• *aivoice off* — always reply as text\n\n' +
          '_Free voice chain: Edge TTS (no key) → Groq (Whisper key) → Fish Audio (optional)._',
      );
      return;
    }

    // Accept friendly synonyms.
    const map: Record<string, 'off' | 'voice' | 'all'> = {
      off: 'off',
      no: 'off',
      disable: 'off',
      text: 'off',
      on: 'voice',
      voice: 'voice',
      dm: 'voice',
      normal: 'voice',
      all: 'all',
      always: 'all',
      everything: 'all',
    };
    const mode = map[arg];
    if (!mode) {
      await reply(sock, msg, 'ℹ️ Usage: *aivoice on | all | off*');
      return;
    }

    settingsRepo.set('aivoice', mode);

    const label =
      mode === 'off'
        ? 'OFF — AI replies are text only now.'
        : mode === 'voice'
          ? 'VOICE-FOR-VOICE — send me a voice note and I will answer with one. 🎙️'
          : 'ALL — every AI reply is now spoken as a voice note. 🗣️';

    await reply(sock, msg, `✅ AI voice replies: *${label}*`);
  },
};

export default aivoice;
