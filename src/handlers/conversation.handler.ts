import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import {
  aiModeWantsReply,
  memoryEnabled,
  voiceReplyMode,
} from '../middleware/aimode';
import { isGroupAdmin, isSudo } from '../middleware/permission';
import { chatMemoryRepo } from '../database/repositories/chatmemory.repo';
import { groupBrainRepo } from '../database/repositories/groupbrain.repo';
import { reply, react } from '../services/message.service';
import {
  analyzeImage,
  getAIReplyWithTools,
  isAIConfigured,
  isTranscriptionConfigured,
  isVisionConfigured,
} from '../services/ai.service';
import {
  aiToolsSystemPrompt,
  buildAITools,
  buildToolExecutor,
  handleNaturalCommandRequest,
  handlePendingIntentMessage,
} from '../services/ai-tools.service';
import {
  buildGroupBrainContext,
  deterministicGroupAnswer,
  formatLagosEvent,
  groupBrainWantsReply,
  parseGroupTeaching,
} from '../services/groupbrain.service';
import { buildVenomBrain } from '../services/venom-brain';
import { isSpeakableLength, speakText } from '../services/tts.service';
import { downloadMedia, toVoiceNote } from '../services/media.service';
import { logger } from '../utils/logger';
import { transcribeVoiceNote } from './voice.handler';
import { handleOnboardingIntroduction } from '../services/onboarding.service';
import { handleNaturalTournament } from '../services/tournament-natural.service';

/**
 * Handle non-command conversation features: purchase confirmations, Group
 * Brain teaching/observations, multimodal AI and voice replies.
 */
export async function handleConversation(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<void> {
  // Purchase confirmation is deterministic and runs even when AI mode is off.
  if (await handlePendingIntentMessage(sock, msg)) return;

  // Registration, receipts and exact quoted owner decisions are deterministic.
  if (await handleNaturalTournament(sock, msg)) return;

  // Structured newcomer introductions are parsed without spending AI quota.
  // Raw introduction text is not retained after the compact profile is saved.
  if (await handleOnboardingIntroduction(sock, msg)) return;

  const brain = msg.isGroup ? groupBrainRepo.get(msg.chat) : undefined;
  if (brain?.enabled) {
    const observed = msg.body.trim() ||
      (msg.type === 'imageMessage' ? '[image submitted]' : msg.type === 'videoMessage' ? '[video submitted]' : '');
    if (observed) groupBrainRepo.recordObservation(msg.chat, msg.senderNumber, observed);
  }
  // An owner/admin can teach with “Venom, remember…” even before `.brain on`;
  // the first accepted lesson enables the Group Brain automatically.
  if (msg.isGroup && (await handleGroupTeaching(sock, msg))) return;

  if (brain?.enabled && msg.body.trim()) {
    const known = deterministicGroupAnswer(msg.chat, msg.body);
    if (known) {
      const mentions = [...known.matchAll(/@(\d{10,15})/g)].map(
        (match) => `${match[1]}@s.whatsapp.net`,
      );
      await sock.sendMessage(
        msg.chat,
        { text: known, mentions },
        { quoted: msg.raw },
      );
      return;
    }
  }

  if (msg.type === 'imageMessage') {
    if (brain?.enabled && groupBrainRepo.needsPhoto(msg.chat, msg.senderNumber)) {
      await handleNewcomerPicture(sock, msg, brain.newcomerPhotoPolicy);
      return;
    }
    if (conversationWantsReply(sock, msg)) {
      await handleAIImage(sock, msg);
    }
    return;
  }

  if (msg.type === 'videoMessage') {
    if (conversationWantsReply(sock, msg)) {
      await reply(
        sock,
        msg,
        'I can understand the caption, but I have not inspected the video itself. Send a key screenshot for vision analysis; short-video frame and audio analysis is being added separately.',
      );
    }
    return;
  }

  if (msg.type === 'audioMessage') {
    if (conversationWantsReply(sock, msg)) await handleAIVoiceNote(sock, msg);
    return;
  }

  if (msg.body.trim().length > 0 && conversationWantsReply(sock, msg)) {
    await aiConverse(sock, msg, msg.body, false);
  }
}

function conversationWantsReply(sock: WASocket, msg: SerializedMessage): boolean {
  const brain = msg.isGroup ? groupBrainRepo.get(msg.chat) : undefined;
  if (brain?.enabled) {
    return isAIConfigured() && groupBrainWantsReply(sock, msg, brain);
  }
  return aiModeWantsReply(msg);
}

function targetMime(raw: any): string {
  return raw.message?.imageMessage?.mimetype || 'image/jpeg';
}

async function handleNewcomerPicture(
  sock: WASocket,
  msg: SerializedMessage,
  policy: 'off' | 'record' | 'review',
): Promise<void> {
  if (policy === 'record') {
    groupBrainRepo.markPhotoSubmitted(msg.chat, msg.senderNumber, 'accepted');
    await react(sock, msg, '✅');
    await reply(sock, msg, '✅ Picture submission recorded. Welcome to the group.');
    return;
  }

  if (policy === 'review' && isVisionConfigured()) {
    await react(sock, msg, '👁️');
    try {
      const image = await downloadMedia(msg.raw);
      const result = await analyzeImage(
        image,
        'This is a group newcomer-picture check. Do not identify the person, infer sensitive traits, rate appearance, or describe their body. Reply with exactly ACCEPT if this is a reasonably clear ordinary photograph containing a visible person. Otherwise reply REVIEW.',
        targetMime(msg.raw),
      );
      const accepted = /^\s*accept\b/i.test(result);
      groupBrainRepo.markPhotoSubmitted(
        msg.chat,
        msg.senderNumber,
        accepted ? 'accepted' : 'review',
      );
      await react(sock, msg, accepted ? '✅' : '🟡');
      await reply(
        sock,
        msg,
        accepted
          ? '✅ Picture submission recorded. Welcome to the group.'
          : '🟡 Picture received and recorded for an admin to review.',
      );
      return;
    } catch (err) {
      logger.debug({ err }, 'newcomer picture review failed');
    }
  }

  groupBrainRepo.markPhotoSubmitted(msg.chat, msg.senderNumber, 'review');
  await reply(sock, msg, '📷 Picture received and recorded for an admin to review.');
}

async function handleAIImage(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<void> {
  if (!isVisionConfigured()) {
    await reply(
      sock,
      msg,
      '👁️ Image understanding needs a Gemini, OpenAI or vision-capable OpenRouter key.',
    );
    return;
  }

  const question = msg.body
    .replace(/^\s*(?:hey\s+)?venom\b[\s,:-]*/i, '')
    .trim();
  const groupContext = msg.isGroup ? buildGroupBrainContext(msg.chat) : '';
  const prompt = [
    groupContext,
    question
      ? `The user sent this image and asked: ${question}`
      : 'Explain the useful or relevant content of this image briefly. If it contains text, read the important text. Do not identify unknown people or infer sensitive traits.',
  ]
    .filter(Boolean)
    .join('\n\n');

  await react(sock, msg, '👁️');
  try {
    const image = await downloadMedia(msg.raw);
    const answer = await analyzeImage(image, prompt, targetMime(msg.raw));
    await react(sock, msg, '✅');
    if (memoryEnabled()) {
      chatMemoryRepo.record(msg.chat, `[Image] ${question || 'Please inspect this.'}`, answer);
    }
    await reply(sock, msg, answer);
  } catch (err) {
    logger.debug({ err }, 'AI-mode image understanding failed');
    await react(sock, msg, '❌');
    await reply(sock, msg, 'I could not inspect that image right now. Please try again shortly.');
  }
}

async function handleGroupTeaching(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<boolean> {
  if (!msg.body.trim()) return false;
  const action = parseGroupTeaching(msg.body);
  if (!action) return false;

  const allowed =
    isSudo(msg.senderNumber) ||
    (msg.isGroup && (await isGroupAdmin(sock, msg.chat, msg.sender).catch(() => false)));
  if (!allowed) {
    await reply(sock, msg, 'Only the owner or a group admin can teach official group knowledge.');
    return true;
  }

  groupBrainRepo.setEnabled(msg.chat, true);
  switch (action.kind) {
    case 'fact': {
      const fact = groupBrainRepo.addFact(msg.chat, action.value, msg.senderNumber);
      await reply(sock, msg, fact ? `✅ I’ll remember: _${fact.text}_` : 'I did not find anything to remember.');
      return true;
    }
    case 'forget': {
      const removed = groupBrainRepo.removeFacts(msg.chat, action.value);
      await reply(sock, msg, removed ? `🧹 Removed ${removed} matching fact(s).` : 'I could not find that in official group knowledge.');
      return true;
    }
    case 'purpose':
      groupBrainRepo.setPurpose(msg.chat, action.value);
      await reply(sock, msg, `✅ I understand the group purpose: _${action.value}_`);
      return true;
    case 'style':
      groupBrainRepo.addStyle(msg.chat, action.value);
      await reply(sock, msg, `✅ I’ll follow that style: _${action.value}_`);
      return true;
    case 'photo':
      groupBrainRepo.setPhotoPolicy(msg.chat, action.value);
      groupBrainRepo.addFact(
        msg.chat,
        action.value === 'off'
          ? 'Newcomers are not required to submit a picture.'
          : 'Every newcomer must submit the picture required by the group after joining.',
        msg.senderNumber,
      );
      await reply(sock, msg, `✅ Newcomer picture policy set to *${action.value}*.`);
      return true;
    case 'room-admins': {
      const admins = msg.mentions.map((jid) => jid.split('@')[0].split(':')[0].replace(/\D/g, '')).filter(Boolean);
      if (!admins.length) {
        await reply(sock, msg, 'Mention the room admins in the same message so I know exactly who you mean.');
        return true;
      }
      groupBrainRepo.setRoomAdmins(msg.chat, admins);
      await reply(sock, msg, `✅ Saved ${admins.length} room admin(s).`);
      return true;
    }
    case 'match': {
      const event = groupBrainRepo.addEvent(msg.chat, {
        kind: 'room-match',
        title: action.title,
        startsAt: action.startsAt,
        createdBy: msg.senderNumber,
      });
      await reply(
        sock,
        msg,
        `✅ Room match scheduled for *${formatLagosEvent(event.startsAt)}* (Lagos). I’ll remind room admins 30 minutes before and the group 10 minutes before.`,
      );
      return true;
    }
  }
}

/** Hear a voice note and answer it through the normal AI conversation path. */
async function handleAIVoiceNote(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<void> {
  if (!isTranscriptionConfigured()) {
    await reply(
      sock,
      msg,
      '🎙️ Understanding speech currently needs a Groq key for Whisper transcription.',
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
    await reply(sock, msg, '🎙️ I heard silence. Speak closer to the mic, or send text.');
    return;
  }

  if (msg.isGroup && groupBrainRepo.get(msg.chat)?.enabled) {
    groupBrainRepo.recordObservation(msg.chat, msg.senderNumber, `[Voice] ${heard}`);
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

  // Do not leave clear command requests to model discretion. For example,
  // “Venom give me sensi .a7pro” should execute `.sensi a7pro`, not produce a
  // generic explanation of sensitivity settings.
  const directAction = await handleNaturalCommandRequest(sock, msg, prompt);
  if (directAction) {
    if (remember) chatMemoryRepo.record(msg.chat, prompt, directAction);
    return;
  }

  const history = remember ? chatMemoryRepo.history(msg.chat) : [];
  const groupContext = msg.isGroup ? buildGroupBrainContext(msg.chat) : '';
  const system = [buildVenomBrain(), groupContext].filter(Boolean).join('\n\n');

  await sock.sendPresenceUpdate('composing', msg.chat).catch(() => {});
  const answer = await getAIReplyWithTools({
    prompt,
    system,
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
      logger.debug(`AI voice reply via ${speech.provider} for ${msg.senderNumber}`);
      return;
    } catch {
      // Every TTS provider failed; preserve the answer by sending text below.
    }
  }

  await reply(sock, msg, answer);
}
