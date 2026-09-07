import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { isBotAdmin } from '../../middleware/permission';

const DURATIONS: Record<string, number> = {
  off: 0,
  '0': 0,
  '24h': 86_400,
  '1d': 86_400,
  '7d': 604_800,
  week: 604_800,
  '90d': 7_776_000,
  '3months': 7_776_000,
};

/** Toggle disappearing (ephemeral) messages for the group. */
const ephemeral: Command = {
  name: 'ephemeral',
  aliases: ['disappearing', 'vanish'],
  category: 'group',
  description: 'Set disappearing messages: off | 24h | 7d | 90d.',
  usage: 'ephemeral off|24h|7d|90d',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, args }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin to change this setting.');
      return;
    }
    const key = (args[0] ?? '').toLowerCase();
    if (!(key in DURATIONS)) {
      await reply(
        sock,
        msg,
        'ℹ️ Usage: `.ephemeral off | 24h | 7d | 90d`',
      );
      return;
    }
    const seconds = DURATIONS[key];
    try {
      await sock.groupToggleEphemeral(msg.chat, seconds);
      await reply(
        sock,
        msg,
        seconds === 0
          ? '✅ Disappearing messages turned *OFF*.'
          : `✅ Disappearing messages set to *${key}*.`,
      );
    } catch {
      await reply(sock, msg, '❌ Could not change disappearing messages.');
    }
  },
};

export default ephemeral;
