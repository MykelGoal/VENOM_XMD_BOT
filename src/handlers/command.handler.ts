import type { WASocket } from '@whiskeysockets/baileys';
import { env } from '../config';
import type { SerializedMessage } from '../types/message.type';
import type { CommandContext } from '../types/command.type';
import { commands, loadCommands } from '../commands';
import { checkCooldown } from '../middleware/cooldown';
import { isBanned } from '../middleware/ban';
import { isOwner, isSudo, isGroupAdmin } from '../middleware/permission';
import { aiModeWantsReply, voiceReplyMode, memoryEnabled } from '../middleware/aimode';
import { settingsRepo } from '../database/repositories/settings.repo';
import { accessRepo } from '../database/repositories/access.repo';
import { chatMemoryRepo } from '../database/repositories/chatmemory.repo';
import { reply, react } from '../services/message.service';
import { getAIReply, getAIReplyWithTools, isTranscriptionConfigured } from '../services/ai.service';
import {
  buildAITools,
  buildToolExecutor,
  aiToolsSystemPrompt,
  handlePendingIntentMessage,
} from '../services/ai-tools.service';
import { speakText, isSpeakableLength } from '../services/tts.service';
import { transcribeVoiceNote } from './voice.handler';
import { userRepo } from '../database/repositories/user.repo';
import { logger } from '../utils/logger';

// Load all commands once at module init.
loadCommands();

/**
 * Parses an incoming message for a command, runs middleware checks,
 * then executes the matching command.
 */
export async function handleCommand(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<void> {
  const { prefix } = env;

  // AI auto-reply ("AI mode"): reply to normal (non-command) messages with AI.
  //   settings 'aimode':  off (default) | dm | all
  //   env AI_AUTO_REPLY=true is treated as 'dm' for backward compatibility.
  //   Voice notes are HEARD (Groq Whisper) and answered like any text — and,
  //   depending on the 'aivoice' setting, answered with a spoken voice note
  //   (voice-for-voice, like a human — see middleware/aimode.ts).
  if (!msg.body.startsWith(prefix)) {
    // AI purchase confirmation ("yes" / "no" to a proposed buy) — handled by
    // deterministic code BEFORE any AI call, and even when AI mode is off
    // (so .ai users can confirm too). Money never waits on a model.
    if (await handlePendingIntentMessage(sock, msg)) return;
    if (msg.type === 'audioMessage') {
      await handleAIVoiceNote(sock, msg);
      return;
    }
    if (aiModeWantsReply(msg) && msg.body.trim().length > 0) {
      await aiConverse(sock, msg, msg.body, false);
    }
    return;
  }

  const [rawName, ...args] = msg.body.slice(prefix.length).trim().split(/\s+/);
  const name = rawName.toLowerCase();
  if (!name) return;

  const command =
    commands.get(name) ??
    [...commands.values()].find((c) => c.aliases?.includes(name));

  if (!command) return;

  // ── Middleware: banned / ignored users ──────────────────────
  if (isBanned(msg.senderNumber)) return;
  if (accessRepo.is(msg.senderNumber, 'ignored') && !isOwner(msg.senderNumber))
    return;

  // ── Middleware: private mode (owner/sudo only) ──────────────
  const mode = settingsRepo.get('mode') ?? 'public';
  if (mode === 'private' && !isSudo(msg.senderNumber)) return;

  // ── Middleware: permissions ─────────────────────────────────
  if (command.ownerOnly && !isSudo(msg.senderNumber)) {
    await reply(sock, msg, '🚫 This command is for the bot owner only.');
    return;
  }

  if (command.groupOnly && !msg.isGroup) {
    await reply(sock, msg, '🚫 This command only works in groups.');
    return;
  }

  if (command.adminOnly && msg.isGroup) {
    const admin = await isGroupAdmin(sock, msg.chat, msg.sender);
    if (!admin) {
      await reply(sock, msg, '🚫 Only group admins can use this command.');
      return;
    }
  }

  // ── Middleware: cooldown ────────────────────────────────────
  const remaining = checkCooldown(msg.senderNumber, command.name);
  if (remaining > 0) {
    await reply(sock, msg, `⏳ Wait ${remaining}s before using that again.`);
    return;
  }

  // ── Execute ─────────────────────────────────────────────────
  const ctx: CommandContext = {
    sock,
    msg,
    args,
    text: args.join(' '),
    prefix,
  };

  // Auto-react to the command when cmdreact is enabled.
  if (settingsRepo.getBool('cmdreact')) {
    await sock
      .sendMessage(msg.chat, { react: { text: '⚡', key: msg.raw.key } })
      .catch(() => {});
  }

  try {
    await command.run(ctx);
    userRepo.incrementCommands(msg.senderNumber);
    logger.debug(`Ran command "${command.name}" for ${msg.senderNumber}`);
  } catch (err) {
    logger.error({ err }, `Command "${command.name}" failed`);
    await reply(sock, msg, '❌ Something went wrong running that command.');
  }
}

/**
 * AI mode × voice notes: HEAR the note with Groq Whisper, then answer it
 * like any text message (see aiConverse). The speaker always gets a reply —
 * an honest explanation instead of silence when transcription isn't set up.
 */
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
    await reply(sock, msg, '🎙️ I heard… silence. Speak closer to the mic, or just send text.');
    return;
  }

  await aiConverse(sock, msg, heard, true);
}

/**
 * One AI-mode conversation turn: prompt in → text or SPOKEN reply out.
 *
 * Voice replies follow the 'aivoice' setting:
 *   'voice' (default) — speak only when the user spoke to us via voice note
 *   'all'             — speak every AI reply
 *   'off'             — always text
 * Long answers stay text (humans don't send 2-minute monologues), and if
 * every TTS provider fails the text reply still goes out — never silence.
 */
async function aiConverse(
  sock: WASocket,
  msg: SerializedMessage,
  prompt: string,
  incomingWasVoice: boolean,
): Promise<void> {
  // Recent turns so the AI remembers the conversation (owner: .aimemory).
  const remember = memoryEnabled();
  const history = remember ? chatMemoryRepo.history(msg.chat) : [];

  await sock.sendPresenceUpdate('composing', msg.chat).catch(() => {});
  // AI 2.0: the AI gets TOOLS — it can run commands, check wallets and
  // propose purchases itself instead of just telling the user what to type.
  const answer = await getAIReplyWithTools({
    prompt,
    history,
    tools: buildAITools(),
    execute: buildToolExecutor(sock, msg),
    toolsSystem: aiToolsSystemPrompt(),
  });
  await sock.sendPresenceUpdate('paused', msg.chat).catch(() => {});

  // Record the turn (bounded: 16 messages/chat, 24h TTL).
  if (remember) chatMemoryRepo.record(msg.chat, prompt, answer);

  const mode = voiceReplyMode();
  const wantVoice =
    (mode === 'all' || (mode === 'voice' && incomingWasVoice)) &&
    isSpeakableLength(answer);

  if (wantVoice) {
    try {
      // Show the human "recording audio…" indicator while we synthesise.
      await sock.sendPresenceUpdate('recording', msg.chat).catch(() => {});
      const speech = await speakText(answer);
      await sock.sendMessage(
        msg.chat,
        { audio: speech.audio, mimetype: 'audio/mpeg', ptt: true },
        { quoted: msg.raw },
      );
      logger.debug(`AI voice reply via ${speech.provider} for ${msg.senderNumber}`);
      return;
    } catch {
      /* all TTS providers failed — fall through to the text reply */
    }
  }

  await reply(sock, msg, answer);
}
