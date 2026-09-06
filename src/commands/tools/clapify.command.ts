import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'clapify',
  aliases: ["claptext"],
  category: 'tools',
  description: "Insert clap emojis between words.",
  usage: 'clap <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *clapify <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => text.trim().split(/\s+/).join(' 👏 '))(text2);
    await reply(sock, msg, out);
  },
};

export default command;
