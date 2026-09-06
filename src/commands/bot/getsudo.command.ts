import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { accessRepo } from '../../database/repositories/access.repo';

const getsudo: Command = {
  name: 'getsudo',
  aliases: ['listsudo', 'sudolist'],
  category: 'bot',
  description: 'List all sudo users.',
  usage: 'getsudo',
  ownerOnly: true,
  async run({ sock, msg }) {
    const list = accessRepo.list('sudo');
    if (list.length === 0) {
      await reply(sock, msg, '📭 No sudo users.');
      return;
    }
    await reply(sock, msg, `👑 *Sudo users*\n\n${list.map((n) => `• ${n}`).join('\n')}`);
  },
};

export default getsudo;
