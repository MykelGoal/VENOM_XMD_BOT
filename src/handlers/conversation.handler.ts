import type { WASocket } from '@whiskeysockets/baileys';
import { env } from '../config';
import type { SerializedMessage } from '../types/message.type';
import {
  aiModeWantsReply,
  memoryEnabled,
  voiceReplyMode,
} from '../middleware/aimode';
import { chatMemoryRepo } from '../database/repositories/chatmemory.repo';
import { reply, react } from '../services/message.service';
import {
  getAIReplyWithTools,
  isTranscriptionConfigured,
} from '../services/ai.service';
import {
  aiToolsSystemPrompt,
  buildAITools,
  buildToolExecutor,
  handlePendingIntentMessage,
} from '../services/ai-tools.service';
import { isSpeakableLength, speakText } from '../services/tts.service';
import { toVoiceNote } from '../services/media.service';
import { logger } from '../utils/logger';
import { transcribeVoiceNote } from './voice.handler';

/**
 * Handle non-command conversation features: purchase confirmations, AI text
 * replies and AI voice-note replies. Keeping this out of the command router
 * gives commands and conversational AI separate, testable boundaries.
 */
export async function handleConversation(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<void> {
  // Purchase confirmation is deterministic and runs even when AI mode is off.
  // Money never waits on a model to decide whether "yes" means confirmation.
  if (await handlePendingIntentMessage(sock, msg)) return;

  if (msg.type === 'audioMessage') {
    await handleAIVoiceNote(sock, msg);
    return;
  }

  if (aiModeWantsReply(msg) && msg.body.trim().length > 0) {
    await aiConverse(sock, msg, msg.body, false);
  }
}

/** Hear a voice note and answer it through the normal AI conversation path. */
async function handleAIVoiceNote(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<void> {
  if (!aiModeWantsReply(msg)) return;

  if (!isTranscriptionConfigured()) {
    await reply(
      sock,
      msg,
      '🎙️ I hear your voice note! But understanding speech needs a free Groq key.\n' +
        `Owner: set it with *${env.prefix}setkey groq <key>* — free at console.groq.com.`,
    );
    return;
  }

  await react(sock, msg, '🎙️');
  let heard: string;
  try {
    heard = await transcribeVoiceNote(msg);
  } catch (err) {
    await react(sock, msg, '❌');
    const why =
      (err as Error)?.message === 'TOO_LONG'
        ? 'That voice note is too long (5 minutes max).'
        : "I couldn't make out that voice note.";
    await reply(sock, msg, `🎙️ ${why} Please try again or send text.`);
    return;
  }

  if (!heard.trim()) {
    await react(sock, msg, '❌');
    await reply(
      sock,
      msg,
      '🎙️ I heard… silence. Speak closer to the mic, or just send text.',
    );
    return;
  }

  await aiConverse(sock, msg, heard, true);
}

/** One conversational AI turn: prompt in, then text or spoken reply out. */
async function aiConverse(
  sock: WASocket,
  msg: SerializedMessage,
  prompt: string,
  incomingWasVoice: boolean,
): Promise<void> {
  const remember = memoryEnabled();
  const history = remember ? chatMemoryRepo.history(msg.chat) : [];

  await sock.sendPresenceUpdate('composing', msg.chat).catch(() => {});
  const answer = await getAIReplyWithTools({
    prompt,
    history,
    tools: buildAITools(),
    execute: buildToolExecutor(sock, msg),
    toolsSystem: aiToolsSystemPrompt(),
  });
  await sock.sendPresenceUpdate('paused', msg.chat).catch(() => {});

  if (remember) chatMemoryRepo.record(msg.chat, prompt, answer);

  const mode = voiceReplyMode();
  const wantVoice =
    (mode === 'all' || (mode === 'voice' && incomingWasVoice)) &&
    isSpeakableLength(answer);

  if (wantVoice) {
    try {
      await sock.sendPresenceUpdate('recording', msg.chat).catch(() => {});
      const speech = await speakText(answer);
      await sock.sendMessage(
        msg.chat,
        {
          audio: await toVoiceNote(speech.audio),
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
        },
        { quoted: msg.raw },
      );
      logger.debug(
        `AI voice reply via ${speech.provider} for ${msg.senderNumber}`,
      );
      return;
    } catch {
      // Every TTS provider failed; preserve the answer by sending text below.
    }
  }

  await reply(sock, msg, answer);
}
