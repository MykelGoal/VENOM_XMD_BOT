import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { getStats } from '../../services/stats.service';
import { env } from '../../config';

/** Show VENOM's growth stats — GitHub stars, YouTube subs, TikTok, etc. */
const stats: Command = {
  name: 'stats',
  aliases: ['growth', 'followers', 'stars'],
  category: 'general',
  description: 'Show VENOM-XMD growth stats (GitHub stars, subs, followers).',
  usage: 'stats',
  async run({ sock, msg }) {
    await react(sock, msg, '📈');
    const s = await getStats();

    const lines: string[] = [`📈 *VENOM-XMD — Growth*`, ''];
    if (s.githubStars !== undefined) lines.push(`⭐ GitHub stars: *${s.githubStars}*`);
    if (s.githubForks !== undefined) lines.push(`🍴 Forks: *${s.githubForks}*`);
    if (s.youtubeSubs !== undefined) lines.push(`📺 YouTube subs: *${s.youtubeSubs}*`);
    if (s.tiktokFollowers !== undefined)
      lines.push(`🎵 TikTok followers: *${s.tiktokFollowers}*`);
    for (const [k, v] of Object.entries(s.manual)) {
      if (k === 'tiktok') continue;
      lines.push(`• ${k}: *${v}*`);
    }

    lines.push(
      '',
      '🕷️ *Join the crew:*',
      `⭐ Star: github.com/${env.social.githubRepo}`,
      `📢 Channel: ${env.social.whatsappChannel}`,
      `🎵 TikTok: ${env.social.tiktokHandle}`,
      `📺 YouTube: ${env.social.youtubeHandle}`,
      '',
      'Want your OWN bot? Deploy free — it takes 2 minutes.',
    );

    await react(sock, msg, '✅');
    await reply(sock, msg, lines.join('\n'));
  },
};

export default stats;
