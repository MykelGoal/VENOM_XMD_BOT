import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { sleep } from '../../utils/helpers';

const restart: Command = {
  name: 'restart',
  category: 'owner',
  description: 'Restart the bot process (best used under PM2/nodemon).',
  usage: 'restart',
  ownerOnly: true,
  async run({ sock, msg }) {
    await reply(sock, msg, '♻️ Restarting...');
    await sleep(1000);
    // A process manager (PM2/nodemon) will bring it back up.
    process.exit(0);
  },
};

export default restart;
