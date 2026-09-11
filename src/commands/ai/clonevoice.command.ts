import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, toMp3 } from '../../services/media.service';
import { cloneVoice, speak, isVoiceConfigured } from '../../services/voice.service';
import { voiceRepo } from '../../database/repositories/voice.repo';
import { toVoiceNote } from '../../services/media.service';

/**
 * Clone a voice from a sample and save it for the sender.
 *
 * Usage: reply to a voice note / audio (10–30s of clean speech) with:
 *   .clonevoice <name>
 *
 * OWNER/SUDO ONLY by design — cloning arbitrary people's voices is a deepfake
 * and abuse risk, and it consumes the deployer's paid Fish Audio quota. Keep it
 * locked down. After cloning, the voice is used automatically by `.tts`.
 */
const clonevoice: Command = {
  name: 'clonevoice',
  aliases: ['clonevoice', 'voiceclone', 'makevoice'],
  category: 'ai',
  ownerOnly: true,
  description: 'Clone a voice from a replied audio sample (owner only).',
  usage: 'clonevoice <name> (reply to a 10–30s voice note)',
  async run({ sock, msg, text }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'audioMessage') {
      await reply(
        sock,
        msg,
        'ℹ️ Reply to a *voice note / audio* (10–30s of clean speech) with:\n' +
          '`.clonevoice <name>`\n\n' +
          '⚠️ Only clone voices you have permission to use.',
      );
      return;
    }

    if (!isVoiceConfigured()) {
      await reply(
        sock,
        msg,
        '❌ Voice cloning needs a Fish Audio key.\n' +
          'Set `FISHAUDIO_API_KEY` (free key at console.fish.audio).',
      );
      return;
    }

    const name = (text || '').trim() || `voice-${msg.senderNumber}`;

    await react(sock, msg, '🧬');
    try {
      const raw = await downloadMedia(target.raw);
      // Normalise to mp3 so Fish always receives a clean, supported container.
      const mp3 = await toMp3(raw);

      const clone = await cloneVoice(mp3, name);
      voiceRepo.set(msg.senderNumber, clone.id, clone.title);

      // Send a quick sample so the user hears the result immediately.
      let sampleNote = '';
      try {
        const sample = await speak(
          `Hey! This is your cloned voice, ${name}, powered by Venom.`,
          { voiceId: clone.id, format: 'mp3' },
        );
        await sock.sendMessage(
          msg.chat,
          { audio: await toVoiceNote(sample), mimetype: 'audio/ogg; codecs=opus', ptt: true },
          { quoted: msg.raw },
        );
      } catch {
        sampleNote = '\n(Could not generate a preview clip, but the clone is saved.)';
      }

      await react(sock, msg, '✅');
      await reply(
        sock,
        msg,
        `✅ Voice cloned as *${clone.title}*.\n` +
          `It's now your default for \`.tts\` — just type \`.tts <text>\`.` +
          sampleNote,
      );
    } catch (err) {
      await react(sock, msg, '❌');
      const m = (err as Error)?.message;
      await reply(
        sock,
        msg,
        m === 'NO_KEY'
          ? '❌ No Fish Audio key configured.'
          : m === 'NO_MODEL_ID'
            ? '❌ Fish Audio did not return a voice model. Try a longer, clearer sample.'
            : '❌ Could not clone that voice. Use 10–30s of clean speech and check your quota.',
      );
    }
  },
};

export default clonevoice;
