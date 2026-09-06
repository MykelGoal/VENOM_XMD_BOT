import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const blocklist: Command = {
  name: 'blocklist',
  aliases: ['blocked'],
  category: 'user',
  description: 'List all users you have blocked.',
  usage: 'blocklist',
  ownerOnly: true,
  async run({ sock, msg }) {
    const list = await sock.fetchBlocklist();
    if (!list || list.length === 0) {
      await reply(sock, msg, '📭 Your block list is empty.');
      return;
    }
    const out = list.map((j) => `• ${(j ?? '').split('@')[0]}`).join('\n');
    await reply(sock, msg, `🚫 *Blocked users (${list.length})*\n\n${out}`);
  },
};

export default blocklist;
