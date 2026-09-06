import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { toBinary, fromBinary } from '../../services/textutils.service';

const binary: Command = {
  name: 'binary',
  aliases: ['bin', 'tobinary', 'unbinary'],
  category: 'tools',
  description: 'Convert text ↔ binary. Auto-detects direction.',
  usage: 'binary <text or binary>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *binary <text>* — or give binary to decode.');
      return;
    }
    try {
      const isBinary = /^[01\s]+$/.test(input.trim());
      const out = isBinary ? fromBinary(input) : toBinary(input);
      await reply(sock, msg, `🔢 ${out}`);
    } catch {
      await reply(sock, msg, '❌ Could not convert that.');
    }
  },
};

export default binary;
