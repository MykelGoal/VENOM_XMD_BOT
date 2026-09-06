import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'urldecode',
  aliases: ["decodeurl"],
  category: 'tools',
  description: "URL-decode text.",
  usage: 'urldecode <text>',
  async run({ sock, msg, text, args }) {
    const input = text || msg.quoted?.body || '';
    if (!input) { await reply(sock, msg, 'ℹ️ Usage: *urldecode <text>*'); return; }
    try { await reply(sock, msg, decodeURIComponent(input)); }
    catch { await reply(sock, msg, '❌ Invalid URL-encoded text.'); }
  },
};

export default command;
