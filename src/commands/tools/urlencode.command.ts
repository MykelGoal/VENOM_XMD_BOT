import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'urlencode',
  aliases: ["encodeurl"],
  category: 'tools',
  description: "URL-encode text.",
  usage: 'urlencode <text>',
  async run({ sock, msg, text, args }) {
    const input = text || msg.quoted?.body || '';
    if (!input) { await reply(sock, msg, 'ℹ️ Usage: *urlencode <text>*'); return; }
    await reply(sock, msg, encodeURIComponent(input));
  },
};

export default command;
