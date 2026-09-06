import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { settingsRepo } from '../../database/repositories/settings.repo';

const getvar: Command = {
  name: 'getvar',
  aliases: ['getkey'],
  category: 'config',
  description: 'Get a global config variable.',
  usage: 'getvar <key>',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const key = args[0];
    if (!key) {
      await reply(sock, msg, 'ℹ️ Usage: *getvar <key>*');
      return;
    }
    const value = settingsRepo.get(key);
    await reply(
      sock,
      msg,
      value === undefined ? `❌ No variable *${key}*.` : `📦 *${key.toLowerCase()}* = ${value}`,
    );
  },
};

export default getvar;
