import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { toHex, fromHex } from '../../services/textutils.service';

const hex: Command = {
  name: 'hex',
  aliases: ['tohex', 'unhex'],
  category: 'tools',
  description: 'Convert text ↔ hexadecimal. Auto-detects direction.',
  usage: 'hex <text or hex>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *hex <text>* — or give hex to decode.');
      return;
    }
    try {
      const cleaned = input.replace(/\s+/g, '');
      const isHex = /^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length % 2 === 0;
      const out = isHex ? fromHex(input) : toHex(input);
      await reply(sock, msg, `🔠 ${out}`);
    } catch {
      await reply(sock, msg, '❌ Could not convert that.');
    }
  },
};

export default hex;
