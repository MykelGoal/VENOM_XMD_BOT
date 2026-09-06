import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** bible-api.com — free, no key. */
const bible: Command = {
  name: 'bible',
  aliases: ['verse'],
  category: 'fun',
  description: 'Get a Bible verse (e.g. "bible John 3:16") or a random one.',
  usage: 'bible [reference]',
  async run({ sock, msg, text }) {
    const ref = text || 'random';
    try {
      const d = await fetchJson<any>(
        `https://bible-api.com/${encodeURIComponent(ref)}`,
      );
      if (!d.text) {
        await reply(sock, msg, `❌ Could not find "${ref}".`);
        return;
      }
      await reply(
        sock,
        msg,
        `📖 *${d.reference}*\n\n${d.text.trim()}`,
      );
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch a verse right now.');
    }
  },
};

export default bible;
