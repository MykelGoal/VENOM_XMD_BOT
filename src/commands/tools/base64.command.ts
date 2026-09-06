import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { toBase64, fromBase64 } from '../../services/textutils.service';

const base64: Command = {
  name: 'base64',
  aliases: ['b64', 'atob', 'btoa'],
  category: 'tools',
  description: 'Encode or decode Base64 text.',
  usage: 'base64 <encode|decode> <text>',
  async run({ sock, msg, args, text }) {
    const mode = (args[0] || '').toLowerCase();
    const payload = text.split(/\s+/).slice(1).join(' ') || msg.quoted?.body || '';
    if ((mode !== 'encode' && mode !== 'decode') || !payload) {
      await reply(sock, msg, 'ℹ️ Usage: *base64 encode <text>* or *base64 decode <text>*');
      return;
    }
    try {
      const out = mode === 'encode' ? toBase64(payload) : fromBase64(payload);
      await reply(sock, msg, `🔡 ${out}`);
    } catch {
      await reply(sock, msg, '❌ Invalid Base64 input.');
    }
  },
};

export default base64;
