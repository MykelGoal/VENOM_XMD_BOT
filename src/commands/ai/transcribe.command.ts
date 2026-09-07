import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, toMp3 } from '../../services/media.service';
import { transcribeAudio, isTranscriptionConfigured } from '../../services/ai.service';

/**
 * Transcribe a voice note / audio to text using Groq Whisper.
 *   .transcribe            (reply to a voice note)
 *   .transcribe en         (hint the spoken language)
 *   .transcribe translate  (translate to English)
 */
const transcribe: Command = {
  name: 'transcribe',
  aliases: ['stt', 'totext', 'voicetext', 'listen'],
  category: 'ai',
  description: 'Transcribe a replied voice note / audio to text (Groq Whisper).',
  usage: 'transcribe [lang|translate] (reply to a voice note)',
  async run({ sock, msg, args }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'audioMessage') {
      await reply(
        sock,
        msg,
        'ℹ️ Reply to a *voice note* or audio with *transcribe*.\n\n' +
          '• `.transcribe` – transcribe in the spoken language\n' +
          '• `.transcribe en` – hint the language (ISO code)\n' +
          '• `.transcribe translate` – translate to English',
      );
      return;
    }

    if (!isTranscriptionConfigured()) {
      await reply(
        sock,
        msg,
        '❌ Voice transcription needs a Groq API key.\n' +
          'Set `GROQ_API_KEY` or use `.setkey groq <key>`.',
      );
      return;
    }

    const first = (args[0] ?? '').toLowerCase();
    const translate = ['translate', 'english', 'en-translate', 'tl'].includes(first);
    const language =
      !translate && /^[a-z]{2}$/.test(first) ? first : undefined;

    await react(sock, msg, '🎙️');
    try {
      const audio = await downloadMedia(target.raw);
      // Normalise to mp3 so Whisper always gets a clean, supported container.
      const mp3 = await toMp3(audio);
      const text = await transcribeAudio(mp3, { translate, language });

      if (!text) {
        await react(sock, msg, '❌');
        await reply(sock, msg, '🤷 Could not make out any speech in that audio.');
        return;
      }

      await react(sock, msg, '✅');
      await reply(
        sock,
        msg,
        `📝 *${translate ? 'Translation' : 'Transcription'}:*\n\n${text}`,
      );
    } catch (err) {
      await react(sock, msg, '❌');
      const msgText =
        (err as Error)?.message === 'NO_KEY'
          ? '❌ No Groq API key configured for transcription.'
          : '❌ Could not transcribe that audio. Try a shorter/clearer clip.';
      await reply(sock, msg, msgText);
    }
  },
};

export default transcribe;
