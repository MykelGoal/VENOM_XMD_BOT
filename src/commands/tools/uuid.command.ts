import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { uuid } from '../../services/textutils.service';

const uuidCmd: Command = {
  name: 'uuid',
  aliases: ['guid'],
  category: 'tools',
  description: 'Generate a random UUID v4.',
  usage: 'uuid [count]',
  async run({ sock, msg, args }) {
    let count = parseInt(args[0], 10);
    if (Number.isNaN(count) || count < 1) count = 1;
    if (count > 10) count = 10;
    const ids = Array.from({ length: count }, () => uuid()).join('\n');
    await reply(sock, msg, `🆔\n\`\`\`${ids}\`\`\``);
  },
};

export default uuidCmd;
