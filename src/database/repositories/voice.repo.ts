import { createCollection } from '../index';

interface VoiceClone extends Record<string, unknown> {
  /** WhatsApp number that owns this clone. */
  number: string;
  /** Fish Audio voice model id (reference_id). */
  modelId: string;
  /** Human label. */
  title: string;
  /** Creation timestamp. */
  at: number;
}

const store = createCollection<VoiceClone>('voiceclones');

/**
 * Stores each user's cloned-voice model id so `.myvoice` / `.tts` can reuse it
 * without re-cloning every time.
 */
export const voiceRepo = {
  set(number: string, modelId: string, title: string): void {
    store.set(number, { number, modelId, title, at: Date.now() });
  },
  get(number: string): VoiceClone | undefined {
    return store.get(number);
  },
  delete(number: string): boolean {
    if (!store.get(number)) return false;
    store.delete(number);
    return true;
  },
  all(): VoiceClone[] {
    return store.all();
  },
};
