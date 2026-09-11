import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import { settingsRepo } from '../database/repositories/settings.repo';
import { reply, react } from '../services/message.service';
import { downloadMedia, toMp3 } from '../services/media.service';
import {
  transcribeAudio,
  isTranscriptionConfigured,
} from '../services/ai.service';
import { aiModeWantsReply } from '../middleware/aimode';
import { logger } from '../utils/logger';

/** Max voice-note length (seconds) we transcribe, to avoid huge clips. */
const MAX_SECONDS = 300;

/**
 * Download + convert + transcribe a voice note to text (Groq Whisper).
 * Shared by auto-transcription (.autovoice) and AI-mode voice replies.
 *
 * @throws Error('TOO_LONG') when the note exceeds MAX_SECONDS.
 */
export async function transcribeVoiceNote(
  msg: SerializedMessage,
): Promise<string> {
  const seconds = (msg.raw.message?.audioMessage?.seconds as number) ?? 0;
  if (seconds && seconds > MAX_SECONDS) throw new Error('TOO_LONG');

  const audio = await downloadMedia(msg.raw);
  const mp3 = await toMp3(audio);
  return transcribeAudio(mp3, { filename: 'voice.mp3' });
}

/**
 * Passive auto-transcription of incoming voice notes.
 *
 * Controlled by the `autovoice` settings flag (owner toggles it with
 * `.autovoice on|off`). When ON, every incoming voice note is transcribed
 * with Groq Whisper and the text is posted as a reply. Silently no-ops when
 * the flag is off, there is no Groq key, or the message isn't a voice note.
 *
 * When AI mode will reply to this voice note (see middleware/aimode.ts),
 * this handler stays out of the way — the command handler transcribes and
 * answers it itself, so the user gets ONE reply instead of two.
 */
export async function handleVoiceNote(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<void> {
  if (msg.type !== 'audioMessage') return;
  if (!settingsRepo.getBool('autovoice')) return;
  if (!isTranscriptionConfigured()) return;
  // AI mode owns voice notes it will answer — don't double-handle.
  if (aiModeWantsReply(msg)) return;

  // Skip absurdly long voice notes.
  const seconds = (msg.raw.message?.audioMessage?.seconds as number) ?? 0;
  if (seconds && seconds > MAX_SECONDS) return;

  try {
    await react(sock, msg, '🎙️');
    const text = await transcribeVoiceNote(msg);
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
