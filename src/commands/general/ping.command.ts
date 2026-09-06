import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const ping: Command = {
  name: 'ping',
  aliases: ['p', 'speed'],
  category: 'general',
  description: 'Check if the bot is alive and measure response latency.',
  usage: 'ping',
  async run({ sock, msg }) {
    const start = Date.now();
    await reply(sock, msg, '🏓 Pinging...');
    const latency = Date.now() - start;
    await reply(sock, msg, `🏓 Pong! *${latency}ms*`);
  },
};

export default ping;
