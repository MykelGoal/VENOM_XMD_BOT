import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { env, META } from '../../config';
import { formatUptime } from '../../utils/helpers';

const alive: Command = {
  name: 'alive',
  aliases: ['status', 'runtime'],
  category: 'general',
  description: 'Show that the bot is alive with runtime stats.',
  usage: 'alive',
  async run({ sock, msg, prefix }) {
    const mem = process.memoryUsage().rss / 1024 / 1024;
    const text = [
      `🕷️ *${env.botName}* is *online!*`,
      '',
      `⏱️ Uptime: ${formatUptime(process.uptime())}`,
      `🧠 Memory: ${mem.toFixed(1)} MB`,
      `⚙️ Node: ${process.version}`,
      `📦 Version: ${META.version}`,
      `🔧 Prefix: ${prefix}`,
      '',
      `Type *${prefix}menu* to see all commands.`,
    ].join('\n');
    await reply(sock, msg, text);
  },
};

export default alive;
