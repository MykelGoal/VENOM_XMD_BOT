import { makeBotToggle } from '../_shared/bottoggle';

/**
 * Toggle automatic transcription of every incoming voice note.
 * When ON, the bot replies to each voice note with its text (Groq Whisper).
 */
const autovoice = makeBotToggle({
  name: 'autovoice',
  aliases: ['autotranscribe', 'voicetotext', 'autostt'],
  key: 'autovoice',
  label: 'Auto voice-note transcription',
  description:
    'Auto-transcribe every incoming voice note to text (Groq Whisper).',
});

export default autovoice;
