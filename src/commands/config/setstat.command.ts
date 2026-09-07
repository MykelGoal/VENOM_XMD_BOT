import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { setManualStat } from '../../services/stats.service';

/**
 * Manually set a growth stat that can't be fetched automatically
 * (TikTok has no free API, so set it by hand after checking your profile).
 *   .setstat tiktok 1500
 *   .setstat "whatsapp users" 8000
 */
const setstat: Command = {
  name: 'setstat',
  aliases: ['setgrowth'],
  category: 'config',
  ownerOnly: true,
  description: 'Manually set a growth stat (e.g. TikTok followers).',
  usage: 'setstat <name> <value>',
  async run({ sock, msg, args }) {
    if (args.length < 2) {
      await reply(
        sock,
        msg,
        'ℹ️ Usage: `.setstat <name> <value>`\n' +
          'Example: `.setstat tiktok 1500`\n\n' +
          'GitHub stars & forks are automatic — you only need this for TikTok ' +
          'or custom numbers.',
      );
      return;
    }
    const value = args[args.length - 1];
    const key = args.slice(0, -1).join(' ').toLowerCase();
    setManualStat(key, value);
    await reply(sock, msg, `✅ Set *${key}* = *${value}*. See it with \`.stats\`.`);
  },
};

export default setstat;
