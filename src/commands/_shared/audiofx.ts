import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, applyAudioFilter, toVoiceNote } from '../../services/media.service';

interface AudioFxOptions {
  name: string;
  aliases?: string[];
  /** ffmpeg audio filter chain. */
  filter: string;
  description?: string;
  /** Whether to send as a voice note (ptt) instead of an audio file. */
  ptt?: boolean;
}

/**
 * Builds an audio-effect command. The user replies to an audio/voice note;
 * we download it, run it through an ffmpeg filter, and send the result.
 */
export function makeAudioFx(opts: AudioFxOptions): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: 'converter',
    description: opts.description ?? `Apply the "${opts.name}" audio effect.`,
    usage: `${opts.name} (reply to audio)`,
    async run({ sock, msg }) {
      const target = msg.quoted ?? msg;
      if (target.type !== 'audioMessage') {
        await reply(sock, msg, `ℹ️ Reply to an audio/voice note with *${opts.name}*.`);
        return;
      }
      await react(sock, msg, '⏳');
      try {
        const audio = await downloadMedia(target.raw);
        const out = await applyAudioFilter(audio, opts.filter);
        const asNote = Boolean(opts.ptt);
        await sock.sendMessage(
          msg.chat,
          {
            audio: asNote ? await toVoiceNote(out) : out,
            mimetype: asNote ? 'audio/ogg; codecs=opus' : 'audio/mpeg',
            ptt: asNote,
          },
          { quoted: msg.raw },
        );
        await react(sock, msg, '✅');
      } catch {
        await react(sock, msg, '❌');
        await reply(sock, msg, '❌ Could not process that audio.');
      }
    },
  };
}
