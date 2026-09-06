import type { Command } from '../../types/command.type';
import { commandsByCategory } from '../index';
import { reply } from '../../services/message.service';
import { env, META } from '../../config';
import { formatUptime } from '../../utils/helpers';

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
      'media',
      'converter',
      'image',
      'textmaker',
      'fun',
      'game',
      'economy',
      'group',
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

    await reply(sock, msg, [...header, ...sections].join('\n').trim());
  },
};

export default menu;
