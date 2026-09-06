import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { toMorse, fromMorse } from '../../services/textutils.service';

const morse: Command = {
  name: 'morse',
  aliases: ['morsecode', 'unmorse'],
  category: 'tools',
  description: 'Convert text ↔ Morse code. Auto-detects direction.',
  usage: 'morse <text or morse>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *morse <text>* — or give Morse to decode.');
      return;
    }
    const isMorse = /^[.\-/\s]+$/.test(input.trim());
    const out = isMorse ? fromMorse(input) : toMorse(input);
    if (!out) {
      await reply(sock, msg, '❌ Nothing convertible in that input.');
      return;
    }
    await reply(sock, msg, `📡 ${out}`);
  },
};

export default morse;
