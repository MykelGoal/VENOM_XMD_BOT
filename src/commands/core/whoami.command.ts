import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { userRepo } from '../../database/repositories/user.repo';
import { isOwner } from '../../middleware/permission';

const whoami: Command = {
  name: 'whoami',
  category: 'general',
  description: 'Show your info as seen by the bot.',
  usage: 'whoami',
  async run({ sock, msg }) {
    const user = userRepo.get(msg.senderNumber);
    const lines = [
      `👤 *Your profile*`,
      '',
      `📱 Number: ${msg.senderNumber}`,
      `🏷️ Role: ${isOwner(msg.senderNumber) ? 'Owner' : 'User'}`,
      `📊 Commands used: ${user?.commandCount ?? 0}`,
      `🚫 Banned: ${user?.banned ? 'yes' : 'no'}`,
    ];
    await reply(sock, msg, lines.join('\n'));
  },
};

export default whoami;
