import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { getSensi, formatSensi } from '../../services/sensi.service';

/**
 * .sensi <phone> — best Free Fire sensitivity for a specific device.
 * Curated proven values for popular phones + smart per-device tuning for
 * anything else. Free Fire sensitivity scales 0–200.
 */
const sensi: Command = {
  name: 'sensi',
  aliases: ['sensitivity', 'ffsensi', 'freefire'],
  category: 'game',
  description: 'Get the best Free Fire sensitivity for your phone.',
  usage: 'sensi <phone name>   e.g. .sensi Tecno Spark Go 2021',
  async run({ sock, msg, args }) {
    const query = args.join(' ').trim();

    if (!query) {
      await reply(
        sock,
        msg,
        [
          '🎯 *VENOM Free Fire Sensitivity*',
          '',
          'Tell me your phone and I’ll give you the *best sensi* for it:',
          '',
          '• `.sensi Tecno Spark Go 2021`',
          '• `.sensi Infinix Hot 40`',
          '• `.sensi Samsung Galaxy A15`',
          '• `.sensi iPhone 11`',
          '',
          '_Works for any phone — even ones no one tested. 🕷️_',
        ].join('\n'),
      );
      return;
    }

    await react(sock, msg, '🎯');
    const result = getSensi(query);
    if (!result) {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Please type a phone name, e.g. `.sensi Tecno Spark 10`.');
      return;
    }
    await react(sock, msg, '✅');
    await reply(sock, msg, formatSensi(result));
  },
};

export default sensi;
