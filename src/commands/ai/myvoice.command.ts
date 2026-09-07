import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { voiceRepo } from '../../database/repositories/voice.repo';
import { deleteVoice, isVoiceConfigured } from '../../services/voice.service';

/**
 * Manage your saved cloned voice.
 *   .myvoice          → show your current clone
 *   .myvoice delete   → remove it (also deletes the model from Fish Audio)
 */
const myvoice: Command = {
  name: 'myvoice',
  aliases: ['myclone', 'voicestatus'],
  category: 'ai',
  description: 'Show or delete your saved cloned voice.',
  usage: 'myvoice [delete]',
  async run({ sock, msg, args }) {
    const mine = voiceRepo.get(msg.senderNumber);
    const sub = (args[0] ?? '').toLowerCase();

    if (sub === 'delete' || sub === 'remove' || sub === 'clear') {
      if (!mine) {
        await reply(sock, msg, "ℹ️ You don't have a cloned voice saved.");
        return;
      }
      // Best-effort remove from Fish Audio too.
      if (isVoiceConfigured()) {
        try {
          await deleteVoice(mine.modelId);
        } catch {
          /* ignore — still clear the local record below */
        }
      }
      voiceRepo.delete(msg.senderNumber);
      await reply(sock, msg, '🗑️ Your cloned voice has been deleted.');
      return;
    }

    if (!mine) {
      await reply(
        sock,
        msg,
        "ℹ️ You don't have a cloned voice yet.\n" +
          'The owner can create one with `.clonevoice <name>` (reply to a voice note).',
      );
      return;
    }

    const when = new Date(mine.at).toLocaleString();
    await reply(
      sock,
      msg,
      `🎙️ *Your voice clone*\n` +
        `• Name: ${mine.title}\n` +
        `• ID: ${mine.modelId}\n` +
        `• Created: ${when}\n\n` +
        `Use it: \`.tts <text>\` · Remove it: \`.myvoice delete\``,
    );
  },
};

export default myvoice;
