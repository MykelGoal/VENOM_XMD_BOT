import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchBuffer } from '../../services/media.service';
import { isUrl } from '../../utils/helpers';

/** tinyurl.com free api-create endpoint (returns plain text). */
const tinyurl: Command = {
  name: 'tinyurl',
  category: 'tools',
  description: 'Shorten a URL with TinyURL.',
  usage: 'tinyurl <url>',
  async run({ sock, msg, text }) {
    if (!text || !isUrl(text)) {
      await reply(sock, msg, 'ℹ️ Usage: *tinyurl <valid url>*');
      return;
    }
    try {
      const buf = await fetchBuffer(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(text)}`,
      );
      await reply(sock, msg, `🔗 ${buf.toString('utf-8')}`);
    } catch {
      await reply(sock, msg, '⚠️ Could not shorten that URL.');
    }
  },
};

export default tinyurl;
