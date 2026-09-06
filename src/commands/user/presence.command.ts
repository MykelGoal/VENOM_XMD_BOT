import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const VALID = ['available', 'unavailable', 'composing', 'recording', 'paused'] as const;
type Presence = (typeof VALID)[number];

const LABELS: Record<Presence, string> = {
  available: '🟢 online',
  unavailable: '⚪ offline',
  composing: '⌨️ typing…',
  recording: '🎙️ recording…',
  paused: '⏸️ paused',
};

const presence: Command = {
  name: 'presence',
  aliases: ['setpresence'],
  category: 'user',
  description: 'Send a presence state to the current chat.',
  usage: 'presence <online|offline|typing|recording|paused>',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const alias: Record<string, Presence> = {
      online: 'available',
      offline: 'unavailable',
      typing: 'composing',
      record: 'recording',
      recording: 'recording',
      paused: 'paused',
      available: 'available',
      unavailable: 'unavailable',
      composing: 'composing',
    };
    const key = (args[0] || '').toLowerCase();
    const state = alias[key];
    if (!state) {
      await reply(
        sock,
        msg,
        'ℹ️ Usage: *presence <online|offline|typing|recording|paused>*',
      );
      return;
    }
    try {
      if (state === 'composing' || state === 'recording') {
        await sock.presenceSubscribe(msg.chat);
      }
      await sock.sendPresenceUpdate(state, msg.chat);
      await reply(sock, msg, `✅ Presence set to ${LABELS[state]}`);
    } catch {
      await reply(sock, msg, '⚠️ Could not update presence.');
    }
  },
};

export default presence;
