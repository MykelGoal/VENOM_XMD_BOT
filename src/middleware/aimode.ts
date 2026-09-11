import { env } from '../config';
import type { SerializedMessage } from '../types/message.type';
import { settingsRepo } from '../database/repositories/settings.repo';
import { isAIConfigured } from '../services/ai.service';

/**
 * AI-mode scope + voice-reply mode helpers.
 *
 * Shared by the command handler (which generates AI replies) and the voice
 * handler (which transcribes voice notes) so the two never double-handle
 * the same message.
 */

/** Resolve the effective AI auto-reply scope: 'off' | 'dm' | 'all'. */
export function aiModeScope(): 'off' | 'dm' | 'all' {
  let aimode = settingsRepo.get('aimode');
  if (!aimode) aimode = env.ai.autoReply ? 'dm' : 'off';
  return aimode === 'all' ? 'all' : aimode === 'dm' ? 'dm' : 'off';
}

/**
 * True when AI auto-reply should engage for this message:
 * aimode on (dm/all matching the chat), an AI key configured, not self.
 */
export function aiModeWantsReply(msg: SerializedMessage): boolean {
  const scope = aiModeScope();
  return (
    scope !== 'off' &&
    isAIConfigured() &&
    !msg.fromMe &&
    (scope === 'all' || !msg.isGroup)
  );
}

/**
 * Voice-note reply mode for AI answers (owner toggles with `.aivoice`):
 *   'voice' (default) — voice-for-voice: speak only when spoken to via voice note
 *   'all'             — speak EVERY AI reply
 *   'off'             — always reply as text
 */
export function voiceReplyMode(): 'off' | 'voice' | 'all' {
  const v = settingsRepo.get('aivoice') || 'voice';
  return v === 'all' || v === 'voice' ? v : 'off';
}

/**
 * AI conversation memory toggle (owner toggles with `.aimemory on|off`).
 * Default ON — the bot remembers the last few turns of each chat (bounded,
 * ~24h, see chatmemory.repo). Users can always clear their own chat with
 * `.aimemory clear`.
 */
export function memoryEnabled(): boolean {
  return (settingsRepo.get('aimemory') || 'on') !== 'off';
}
