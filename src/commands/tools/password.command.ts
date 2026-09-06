import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { password } from '../../services/textutils.service';

const passwordCmd: Command = {
  name: 'password',
  aliases: ['genpass', 'pwd', 'pass'],
  category: 'tools',
  description: 'Generate a strong random password.',
  usage: 'password [length] [nosymbols]',
  async run({ sock, msg, args }) {
    let length = parseInt(args[0], 10);
    if (Number.isNaN(length) || length < 4) length = 16;
    if (length > 128) length = 128;
    const symbols = !args.includes('nosymbols');
    const pw = password(length, symbols);
    await reply(
      sock,
      msg,
      `🔑 *Generated password* (${length} chars)\n\`\`\`${pw}\`\`\`\n\n_Tip: use *password 24* or *password 20 nosymbols*._`,
    );
  },
};

export default passwordCmd;
