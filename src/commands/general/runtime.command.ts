import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { formatUptime } from '../../utils/helpers';

const uptime: Command = {
  name: 'uptime',
  category: 'general',
  description: 'Show how long the bot has been running.',
  usage: 'uptime',
  async run({ sock, msg }) {
    await reply(sock, msg, `⏱️ Uptime: *${formatUptime(process.uptime())}*`);
  },
};

export default uptime;
