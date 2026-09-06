import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { settingsRepo } from '../../database/repositories/settings.repo';

const delvar: Command = {
  name: 'delvar',
  aliases: ['delkey'],
  category: 'config',
  description: 'Delete a global config variable.',
  usage: 'delvar <key>',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const key = args[0];
    if (!key) {
      await reply(sock, msg, 'ℹ️ Usage: *delvar <key>*');
      return;
    }
    const ok = settingsRepo.delete(key);
    await reply(sock, msg, ok ? `🗑️ Deleted *${key.toLowerCase()}*.` : `❌ No variable *${key}*.`);
  },
};

export default delvar;
