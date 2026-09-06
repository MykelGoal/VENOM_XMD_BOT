import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** GitHub public user API — free, no key. */
const github: Command = {
  name: 'github',
  aliases: ['gh'],
  category: 'tools',
  description: 'Look up a GitHub user profile.',
  usage: 'github <username>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *github <username>*');
      return;
    }
    try {
      const u = await fetchJson<any>(
        `https://api.github.com/users/${encodeURIComponent(text.trim())}`,
      );
      const out = [
        `🐙 *${u.name ?? u.login}* (@${u.login})`,
        u.bio ? `\n📝 ${u.bio}` : '',
        '',
        `📦 Repos: ${u.public_repos}`,
        `👥 Followers: ${u.followers} | Following: ${u.following}`,
        u.location ? `📍 ${u.location}` : '',
        `🔗 ${u.html_url}`,
      ]
        .filter(Boolean)
        .join('\n');
      await reply(sock, msg, out);
    } catch {
      await reply(sock, msg, `❌ GitHub user "${text}" not found.`);
    }
  },
};

export default github;
