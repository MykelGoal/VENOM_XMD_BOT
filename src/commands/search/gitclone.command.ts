import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** Returns a GitHub repo's downloadable ZIP link. */
const gitclone: Command = {
  name: 'gitclone',
  aliases: ['clone'],
  category: 'search',
  description: 'Get the ZIP download link for a GitHub repo.',
  usage: 'gitclone <owner/repo or github url>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *gitclone owner/repo*');
      return;
    }
    const match = text.match(
      /(?:github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git|\/|$)/,
    );
    if (!match) {
      await reply(sock, msg, '❌ Invalid repo. Use *owner/repo*.');
      return;
    }
    const [, owner, repo] = match;
    try {
      const d = await fetchJson<any>(
        `https://api.github.com/repos/${owner}/${repo}`,
      );
      const branch = d.default_branch ?? 'main';
      const zip = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
      await reply(
        sock,
        msg,
        `📥 *${d.full_name}*\n⭐ ${d.stargazers_count} | 🍴 ${d.forks_count}\n\n🔗 ${zip}`,
      );
    } catch {
      await reply(sock, msg, `❌ Repo "${owner}/${repo}" not found.`);
    }
  },
};

export default gitclone;
