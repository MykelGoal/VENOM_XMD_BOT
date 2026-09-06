import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupRepo } from '../../database/repositories/group.repo';
import type { GroupModel } from '../../database/models/group.model';

interface ToggleOptions {
  name: string;
  aliases?: string[];
  flag: keyof GroupModel;
  label: string;
  description: string;
}

/** Builds an on/off group setting command backed by the group repo. */
export function makeGroupToggle(opts: ToggleOptions): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: 'group',
    description: opts.description,
    usage: `${opts.name} on|off`,
    groupOnly: true,
    adminOnly: true,
    async run({ sock, msg, args }) {
      const arg = args[0]?.toLowerCase();
      if (arg !== 'on' && arg !== 'off') {
        const current = Boolean(groupRepo.get(msg.chat)?.[opts.flag]);
        await reply(
          sock,
          msg,
          `ℹ️ ${opts.label} is currently *${current ? 'ON' : 'OFF'}*.\nUsage: *${opts.name} on* / *${opts.name} off*`,
        );
        return;
      }
      groupRepo.setFlag(msg.chat, opts.flag, arg === 'on');
      await reply(sock, msg, `✅ ${opts.label} turned *${arg.toUpperCase()}*.`);
    },
  };
}
