import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'base64both',
  aliases: ["b64both","basedecode"],
  category: 'tools',
  description: "Encode AND decode text as base64.",
  usage: 'coinbase <text>',
  async run({ sock, msg, text, args }) {
    const input = text || msg.quoted?.body || '';
    if (!input) { await reply(sock, msg, 'ℹ️ Usage: *base64both <text>*'); return; }
    const enc = Buffer.from(input, 'utf8').toString('base64');
    let dec = '(not valid base64)';
    try { const d = Buffer.from(input, 'base64').toString('utf8'); if (d) dec = d; } catch {}
    await reply(sock, msg, `🔐 Encoded: ${enc}\n🔓 Decoded: ${dec}`);
  },
};

export default command;
