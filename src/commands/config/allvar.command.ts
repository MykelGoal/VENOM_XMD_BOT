import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { settingsRepo } from '../../database/repositories/settings.repo';

const allvar: Command = {
  name: 'allvar',
  aliases: ['listvar', 'vars'],
  category: 'config',
  description: 'List all global config variables.',
  usage: 'allvar',
  ownerOnly: true,
  async run({ sock, msg }) {
    const all = settingsRepo.all();
    if (all.length === 0) {
      await reply(sock, msg, '📭 No config variables set.');
      return;
    }
    const list = all.map((v) => `• *${v.key}* = ${v.value}`).join('\n');
    await reply(sock, msg, `📦 *Config Variables*\n\n${list}`);
  },
};

export default allvar;
