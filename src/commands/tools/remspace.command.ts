import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'remspace',
  aliases: ["nospaces","stripspaces"],
  category: 'tools',
  description: "Remove all spaces from text.",
  usage: 'remspace <text>',
  async run({ sock, msg, text, args }) {
    const input = text || msg.quoted?.body || '';
    if (!input) { await reply(sock, msg, 'ℹ️ Usage: *remspace <text>*'); return; }
    await reply(sock, msg, input.replace(/\s+/g, ''));
  },
};

export default command;
