import type { Command } from '../../types/command.type';
import { commands } from '../index';
import { reply } from '../../services/message.service';

const help: Command = {
  name: 'help',
  aliases: ['h'],
  category: 'general',
  description: 'Show help for a specific command.',
  usage: 'help <command>',
  async run({ sock, msg, args, prefix }) {
    const name = args[0]?.toLowerCase();
    if (!name) {
      await reply(
        sock,
        msg,
        `ℹ️ Usage: *${prefix}help <command>*\nOr type *${prefix}menu* to see everything.`,
      );
      return;
    }

    const cmd =
      commands.get(name) ??
      [...commands.values()].find((c) => c.aliases?.includes(name));

    if (!cmd) {
      await reply(sock, msg, `❌ No command named *${name}*.`);
      return;
    }

    const lines = [
      `📖 *${cmd.name}*`,
      cmd.description,
      '',
      `*Category:* ${cmd.category}`,
      cmd.usage ? `*Usage:* ${prefix}${cmd.usage}` : '',
      cmd.aliases?.length ? `*Aliases:* ${cmd.aliases.join(', ')}` : '',
      cmd.ownerOnly ? '*Access:* owner only' : '',
      cmd.adminOnly ? '*Access:* group admins' : '',
    ].filter(Boolean);

    await reply(sock, msg, lines.join('\n'));
  },
};

export default help;
