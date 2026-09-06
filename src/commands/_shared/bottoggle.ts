import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { settingsRepo } from '../../database/repositories/settings.repo';

interface BotToggleOptions {
  name: string;
  aliases?: string[];
  /** settings key used to persist the flag. */
  key: string;
  label: string;
  description: string;
}

/**
 * Builds an owner-only on/off toggle for a global bot behavior, backed by
 * the settings store. The behaviors themselves are read from settingsRepo
 * where they take effect (event handlers, command handler, etc.).
 */
export function makeBotToggle(opts: BotToggleOptions): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: 'bot',
    description: opts.description,
    usage: `${opts.name} on|off`,
    ownerOnly: true,
    async run({ sock, msg, args }) {
      const arg = args[0]?.toLowerCase();
      if (arg !== 'on' && arg !== 'off') {
        const current = settingsRepo.getBool(opts.key);
        await reply(
          sock,
          msg,
          `ℹ️ ${opts.label} is currently *${current ? 'ON' : 'OFF'}*.\nUsage: *${opts.name} on* / *${opts.name} off*`,
        );
        return;
      }
      settingsRepo.setBool(opts.key, arg === 'on');
      await reply(sock, msg, `✅ ${opts.label} turned *${arg.toUpperCase()}*.`);
    },
  };
}
