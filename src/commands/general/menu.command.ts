import fs from 'fs';
import path from 'path';
import type { Command } from '../../types/command.type';
import { commandsByCategory } from '../index';
import { reply, sendReplyContent } from '../../services/message.service';
import { env, META } from '../../config';
import { formatUptime } from '../../utils/helpers';

/**
 * Resolve the menu banner image. Prefers the bundled assets/logo.png (works
 * fully offline), otherwise falls back to the configured MENU_IMAGE_URL so the
 * banner still shows on hosts that didn't ship the asset.
 */
function resolveMenuImage(): Buffer | { url: string } | null {
  const candidates = [
    path.join(process.cwd(), 'assets', 'logo.png'),
    path.resolve(__dirname, '../../../assets/logo.png'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    } catch {
      /* ignore and try next */
    }
  }
  return env.menuImage ? { url: env.menuImage } : null;
}

const menu: Command = {
  name: 'menu',
  aliases: ['m', 'list', 'help all'],
  category: 'general',
  description: 'Display all available commands, grouped by category.',
  usage: 'menu',
  async run({ sock, msg, prefix }) {
    const grouped = commandsByCategory();
    const order = [
      'general',
      'ai',
      'tools',
      'search',
      'downloader',
      'anime',
      'media',
      'converter',
      'image',
      'textmaker',
      'fun',
      'game',
      'economy',
      'group',
      'bot',
      'config',
      'user',
      'owner',
    ];

    const header = [
      `╭─「 *${env.botName}* 」`,
      `│ ⚡ v${META.version}`,
      `│ ⏱️ Uptime: ${formatUptime(process.uptime())}`,
      `│ 🔧 Prefix: ${prefix}`,
      `╰────────────`,
      '',
    ];

    const sections: string[] = [];
    for (const category of order) {
      const cmds = grouped[category];
      if (!cmds?.length) continue;
      sections.push(`*╭─「 ${category.toUpperCase()} 」*`);
      for (const c of cmds.sort((a, b) => a.name.localeCompare(b.name))) {
        sections.push(`│ ${prefix}${c.name}`);
      }
      sections.push('*╰────────────*', '');
    }

    const caption = [...header, ...sections].join('\n').trim();

    // Send the banner image with the full menu as its caption so pressing
    // .menu shows the VENOM-XMD logo and command list together.
    const image = resolveMenuImage();
    if (image) {
      try {
        await sendReplyContent(sock, msg, { image, caption });
        return;
      } catch {
        /* fall back to text-only if the image fails to send */
      }
    }

    await reply(sock, msg, caption);
  },
};

export default menu;
