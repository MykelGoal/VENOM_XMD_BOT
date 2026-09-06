import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { loadCommands, commands } from '../index';

const reload: Command = {
  name: 'reload',
  aliases: ['refresh'],
  category: 'bot',
  description: 'Reload all command modules without restarting.',
  usage: 'reload',
  ownerOnly: true,
  async run({ sock, msg }) {
    // Clear the require cache for command files so edits are picked up.
    for (const key of Object.keys(require.cache)) {
      if (key.includes('commands') && key.endsWith('.command.js')) {
        delete require.cache[key];
      }
    }
    loadCommands();
    await reply(sock, msg, `♻️ Reloaded. ${commands.size} commands active.`);
  },
};

export default reload;
