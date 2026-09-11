import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { speak, isVoiceConfigured } from '../../services/voice.service';
import { speakText } from '../../services/tts.service';
import { voiceRepo } from '../../database/repositories/voice.repo';
import { toVoiceNote } from '../../services/media.service';

/**
 * Text-to-speech. Speaks the given text as a WhatsApp voice note.
 *   .tts Hello there            → default voice
 *   .say <text>                 → alias
 * If the sender has a personal cloned voice (.clonevoice), it is used
 * automatically. Otherwise the FREE voice chain speaks: Edge TTS (no API
 * key!) → Groq Orpheus → Fish Audio default.
 */
const tts: Command = {
  name: 'tts',
  aliases: ['say', 'speak', 'voice'],
  category: 'ai',
  description: 'Convert text to a spoken voice note (free — no key needed; uses your clone if you have one).',
  usage: 'tts <text>',
  async run({ sock, msg, text }) {
    const say = (text || '').trim() || msg.quoted?.body?.trim() || '';
    if (!say) {
      await reply(sock, msg, 'ℹ️ Give me something to say.\nExample: `.tts Hello from Venom!`');
      return;
    }

    if (say.length > 1000) {
      await reply(sock, msg, '⚠️ That text is too long — keep it under 1000 characters.');
      return;
    }

    // Use the sender's cloned voice if they have one (needs Fish Audio).
    const mine = voiceRepo.get(msg.senderNumber);

    await react(sock, msg, '🎙️');
    try {
      let audio: Buffer;
      if (mine?.modelId && isVoiceConfigured()) {
        audio = await speak(say, { voiceId: mine.modelId, format: 'mp3' });
      } else {
        // Free chain: Edge TTS (no key) → Groq Orpheus → Fish default.
        audio = (await speakText(say)).audio;
      }
      await sock.sendMessage(
        msg.chat,
        { audio: await toVoiceNote(audio), mimetype: 'audio/ogg; codecs=opus', ptt: true },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ All voice engines failed — please try again shortly.');
    }
  },
};

export default tts;
