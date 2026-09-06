import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const lovescore: Command = {
  name: 'lovescore',
  aliases: ['love-score'],
  category: 'fun',
  description: 'Calculate a love score between two names.',
  usage: 'lovescore <name1> & <name2>',
  async run({ sock, msg, text }) {
    if (!text || !/[&+]|and/i.test(text)) {
      await reply(sock, msg, 'ℹ️ Usage: *lovescore Alice & Bob*');
      return;
    }
    const [a, b] = text.split(/\s*[&+]\s*|\s+and\s+/i);
    // Deterministic score from the two names.
    const seed = [...(a + b).toLowerCase()].reduce(
      (s, c) => s + c.charCodeAt(0),
      0,
    );
    const score = seed % 101;
    await reply(
      sock,
      msg,
      `💖 *${a?.trim()}* + *${b?.trim()}* = *${score}%*`,
    );
  },
};

export default lovescore;
