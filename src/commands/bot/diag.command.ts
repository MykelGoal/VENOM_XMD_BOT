import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { commands } from '../index';
import { settingsRepo } from '../../database/repositories/settings.repo';
import { formatUptime, formatBytes } from '../../utils/helpers';
import { env } from '../../config';

const FLAGS = [
  'autotyping', 'autoread', 'autorecord', 'rejectcall',
  'antidelete', 'alwaysonline', 'cmdreact', 'startupmsg',
];

const diag: Command = {
  name: 'diag',
  aliases: ['diagnostics', 'health'],
  category: 'bot',
  description: 'Show bot diagnostics and active behavior toggles.',
  usage: 'diag',
  ownerOnly: true,
  async run({ sock, msg }) {
    const mem = process.memoryUsage();
    const flags = FLAGS.map(
      (f) => `${settingsRepo.getBool(f) ? '🟢' : '⚪'} ${f}`,
    ).join('\n');
    const text = [
      `🩺 *${env.botName} Diagnostics*`,
      '',
      `⏱️ Uptime: ${formatUptime(process.uptime())}`,
      `🧠 RSS: ${formatBytes(mem.rss)}`,
      `📦 Heap: ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}`,
      `⚙️ Node: ${process.version}`,
      `🧩 Commands: ${commands.size}`,
      `🔧 Mode: ${settingsRepo.get('mode') ?? 'public'}`,
      '',
      `*Behaviors:*`,
      flags,
    ].join('\n');
    await reply(sock, msg, text);
  },
};

export default diag;
