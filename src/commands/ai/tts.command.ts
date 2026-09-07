import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { speak, isVoiceConfigured } from '../../services/voice.service';
import { voiceRepo } from '../../database/repositories/voice.repo';

/**
 * Text-to-speech. Speaks the given text as a WhatsApp voice note.
 *   .tts Hello there            → default voice
 *   .say <text>                 → alias
 * If the sender has a personal cloned voice (.clonevoice), it is used
 * automatically — otherwise the default engine voice.
 */
const tts: Command = {
  name: 'tts',
  aliases: ['say', 'speak', 'voice'],
  category: 'ai',
  description: 'Convert text to a spoken voice note (uses your clone if you have one).',
  usage: 'tts <text>',
  async run({ sock, msg, text }) {
    const say = (text || '').trim() || msg.quoted?.body?.trim() || '';
    if (!say) {
      await reply(sock, msg, 'ℹ️ Give me something to say.\nExample: `.tts Hello from Venom!`');
      return;
    }

    if (!isVoiceConfigured()) {
      await reply(
        sock,
        msg,
        '❌ Text-to-speech needs a Fish Audio key.\n' +
          'Owner: set `FISHAUDIO_API_KEY` (free key at console.fish.audio).',
      );
      return;
    }

    if (say.length > 1000) {
      await reply(sock, msg, '⚠️ That text is too long — keep it under 1000 characters.');
      return;
    }

    // Use the sender's cloned voice if they have one.
    const mine = voiceRepo.get(msg.senderNumber);

    await react(sock, msg, '🎙️');
    try {
      const audio = await speak(say, { voiceId: mine?.modelId, format: 'mp3' });
      await sock.sendMessage(
        msg.chat,
        { audio, mimetype: 'audio/mpeg', ptt: true },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      const m = (err as Error)?.message;
      await reply(
        sock,
        msg,
        m === 'NO_KEY'
          ? '❌ No Fish Audio key configured.'
          : '❌ Could not generate speech. Check the key/quota and try again.',
      );
    }
  },
};

export default tts;
