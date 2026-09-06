import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { accessRepo } from '../../database/repositories/access.repo';

const getmods: Command = {
  name: 'getmods',
  aliases: ['listmods', 'modlist'],
  category: 'bot',
  description: 'List all mods.',
  usage: 'getmods',
  ownerOnly: true,
  async run({ sock, msg }) {
    const list = accessRepo.list('mod');
    if (list.length === 0) {
      await reply(sock, msg, '📭 No mods.');
      return;
    }
    await reply(sock, msg, `🛡️ *Mods*\n\n${list.map((n) => `• ${n}`).join('\n')}`);
  },
};

export default getmods;
