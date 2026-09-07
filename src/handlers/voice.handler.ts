import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import { settingsRepo } from '../database/repositories/settings.repo';
import { reply, react } from '../services/message.service';
import { downloadMedia, toMp3 } from '../services/media.service';
import {
  transcribeAudio,
  isTranscriptionConfigured,
} from '../services/ai.service';
import { logger } from '../utils/logger';

/** Max voice-note length (seconds) we auto-transcribe, to avoid huge clips. */
const MAX_SECONDS = 300;

/**
 * Passive auto-transcription of incoming voice notes.
 *
 * Controlled by the `autovoice` settings flag (owner toggles it with
 * `.autovoice on|off`). When ON, every incoming voice note is transcribed
 * with Groq Whisper and the text is posted as a reply. Silently no-ops when
 * the flag is off, there is no Groq key, or the message isn't a voice note.
 */
export async function handleVoiceNote(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<void> {
  if (!settingsRepo.getBool('autovoice')) return;
  if (msg.type !== 'audioMessage') return;
  if (!isTranscriptionConfigured()) return;

  // Skip absurdly long voice notes.
  const seconds = (msg.raw.message?.audioMessage?.seconds as number) ?? 0;
  if (seconds && seconds > MAX_SECONDS) return;

  try {
    await react(sock, msg, '🎙️');
    const audio = await downloadMedia(msg.raw);
    const mp3 = await toMp3(audio);
    const text = await transcribeAudio(mp3, { filename: 'voice.mp3' });
    if (!text) {
      await react(sock, msg, '❌');
      return;
    }
    await react(sock, msg, '✅');
    await reply(sock, msg, `🎙️ *Voice note:*\n\n${text}`);
  } catch (err) {
    logger.warn({ err }, 'auto-transcribe failed');
  }
}
