import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** npm registry — free, no key. */
const npm: Command = {
  name: 'npm',
  aliases: ['npmjs'],
  category: 'search',
  description: 'Look up an npm package.',
  usage: 'npm <package>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *npm <package>*');
      return;
    }
    try {
      const d = await fetchJson<any>(
        `https://registry.npmjs.org/${encodeURIComponent(text.trim())}`,
      );
      const latest = d['dist-tags']?.latest;
      const v = d.versions?.[latest] ?? {};
      const out = [
        `📦 *${d.name}* v${latest}`,
        d.description ? `\n${d.description}` : '',
        '',
        v.license ? `⚖️ License: ${v.license}` : '',
        v.homepage ? `🏠 ${v.homepage}` : '',
        `🔗 https://www.npmjs.com/package/${d.name}`,
      ]
        .filter(Boolean)
        .join('\n');
      await reply(sock, msg, out);
    } catch {
      await reply(sock, msg, `❌ Package "${text}" not found.`);
    }
  },
};

export default npm;
