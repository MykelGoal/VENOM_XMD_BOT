import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const repeat: Command = {
  name: 'repeat',
  aliases: ['spam', 'repeatx'],
  category: 'fun',
  description: 'Repeat a word/phrase N times (max 50).',
  usage: 'repeat <count> <text>',
  async run({ sock, msg, args }) {
    const count = parseInt(args[0], 10);
    const phrase = args.slice(1).join(' ');
    if (Number.isNaN(count) || !phrase) {
      await reply(sock, msg, 'ℹ️ Usage: *repeat <count> <text>*\n\nExample: _repeat 5 hello_');
      return;
    }
    if (count < 1 || count > 50) {
      await reply(sock, msg, '❌ Count must be between 1 and 50.');
      return;
    }
    const out = Array.from({ length: count }, () => phrase).join(' ');
    await reply(sock, msg, out.slice(0, 4000));
  },
};

export default repeat;
