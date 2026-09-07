import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { env } from '../../config';

/** Share VENOM-XMD's official WhatsApp channel + other socials. */
const channel: Command = {
  name: 'channel',
  aliases: ['updates', 'follow', 'socials', 'support', 'community'],
  category: 'general',
  description: 'Get the official VENOM-XMD WhatsApp channel & social links.',
  usage: 'channel',
  async run({ sock, msg }) {
    await react(sock, msg, '📢');

    const text = [
      '📢 *VENOM-XMD — Official Links* 🕷️',
      '',
      'Follow our WhatsApp Channel for updates, new features & announcements:',
      env.social.whatsappChannel,
      '',
      '*More ways to stay connected:*',
      `⭐ GitHub: github.com/${env.social.githubRepo}`,
      `🎵 TikTok: ${env.social.tiktokHandle}`,
      `📺 YouTube: ${env.social.youtubeHandle}`,
      '',
      'Deploy your own bot free — it takes 2 minutes. 🚀',
    ].join('\n');

    await react(sock, msg, '✅');
    await reply(sock, msg, text);
  },
};

export default channel;
