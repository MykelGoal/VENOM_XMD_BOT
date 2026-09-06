import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { settingsRepo } from '../../database/repositories/settings.repo';

/**
 * Self-mode: lets the bot respond to commands you send from your OWN linked
 * number — no second phone needed. Defaults to ON. This toggle always works
 * from your own number (even when self-mode is off) so you can never lock
 * yourself out. Owner-only.
 */
const selfmode: Command = {
  name: 'selfmode',
  aliases: ['self', 'selfbot'],
  category: 'bot',
  description:
    'Toggle running commands from your OWN number (no second phone). Default: ON.',
  usage: 'selfmode on|off',
  ownerOnly: true,
  async run({ sock, msg, args }) {
    const arg = args[0]?.toLowerCase();
    if (arg !== 'on' && arg !== 'off') {
      const current = settingsRepo.getBool('selfmode', true);
      await reply(
        sock,
        msg,
        `ℹ️ Self mode is currently *${current ? 'ON' : 'OFF'}*.\n` +
          `When ON, you can run commands from your own number.\n` +
          `Usage: *selfmode on* / *selfmode off*`,
      );
      return;
    }
    settingsRepo.setBool('selfmode', arg === 'on');
    await reply(
      sock,
      msg,
      `✅ Self mode turned *${arg.toUpperCase()}*.` +
        (arg === 'off'
          ? '\n\n_Tip: you can always send *selfmode on* from this number to re-enable it._'
          : ''),
    );
  },
};

export default selfmode;
