import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { vaporwave } from '../../services/textutils.service';

const vaporwaveCmd: Command = {
  name: 'vaporwave',
  aliases: ['aesthetic', 'fullwidth'],
  category: 'fun',
  description: 'Ｃｏｎｖｅｒｔ ｔｅｘｔ ｔｏ ａｅｓｔｈｅｔｉｃ ｆｕｌｌ-ｗｉｄｔｈ.',
  usage: 'vaporwave <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *vaporwave <text>*');
      return;
    }
    await reply(sock, msg, vaporwave(input));
  },
};

export default vaporwaveCmd;
