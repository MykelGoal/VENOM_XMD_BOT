import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { styleName, formatNames } from '../../services/gamername.service';

/**
 * .ffname <name> — turn a plain name into stylish pro gamer names
 * (fancy fonts, symbols, clan-tag styles). Works for FF, CODM, PUBG, etc.
 */
const ffname: Command = {
  name: 'ffname',
  aliases: ['ign', 'gamername', 'nickname', 'stylename', 'fancyname'],
  category: 'game',
  description: 'Generate stylish pro gamer names (fancy fonts & symbols).',
  usage: 'ffname <name>   e.g. .ffname Venom',
  async run({ sock, msg, args }) {
    const name = args.join(' ').trim();

    if (!name) {
      await reply(
        sock,
        msg,
        [
          '🎮 *VENOM Gamer Name Styler*',
          '',
          'Give me a name and I’ll make it a *pro FF/CODM name*:',
          '',
          '• `.ffname Venom`',
          '• `.ign ProKiller`',
          '',
          '_Fancy fonts + symbols + clan-tag styles. 🕷️_',
        ].join('\n'),
      );
      return;
    }

    if (name.length > 20) {
      await reply(sock, msg, '❌ Keep the name under 20 characters for clean results.');
      return;
    }

    await react(sock, msg, '🎮');
    const result = styleName(name);
    await react(sock, msg, '✅');
    await reply(sock, msg, formatNames(result));
  },
};

export default ffname;
