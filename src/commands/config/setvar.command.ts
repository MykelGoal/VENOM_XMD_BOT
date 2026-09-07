import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { settingsRepo } from '../../database/repositories/settings.repo';

const setvar: Command = {
  name: 'setvar',
  category: 'config',
  description: 'Set a global config variable.',
  usage: 'setvar <key> <value>',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const key = args[0];
    const value = args.slice(1).join(' ');
    if (!key || !value) {
      await reply(sock, msg, 'ℹ️ Usage: *setvar <key> <value>*');
      return;
    }
    settingsRepo.set(key, value);
    await reply(sock, msg, `✅ Set *${key.toLowerCase()}* = ${value}`);
  },
};

export default setvar;
