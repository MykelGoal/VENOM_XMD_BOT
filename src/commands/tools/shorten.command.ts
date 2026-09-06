import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';
import { isUrl } from '../../utils/helpers';

/** is.gd — free, no key URL shortener. */
const shorten: Command = {
  name: 'shorten',
  aliases: ['short'],
  category: 'tools',
  description: 'Shorten a long URL.',
  usage: 'shorten <url>',
  async run({ sock, msg, text }) {
    if (!text || !isUrl(text)) {
      await reply(sock, msg, 'ℹ️ Usage: *shorten <valid url>*');
      return;
    }
    try {
      const d = await fetchJson<any>(
        `https://is.gd/create.php?format=json&url=${encodeURIComponent(text)}`,
      );
      if (d.shorturl) {
        await reply(sock, msg, `🔗 ${d.shorturl}`);
      } else {
        await reply(sock, msg, `❌ ${d.errormessage ?? 'Could not shorten.'}`);
      }
    } catch {
      await reply(sock, msg, '⚠️ URL shortening failed.');
    }
  },
};

export default shorten;
