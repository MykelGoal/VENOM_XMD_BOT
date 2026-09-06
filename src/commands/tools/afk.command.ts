import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { afkRepo } from '../../database/repositories/afk.repo';

const afk: Command = {
  name: 'afk',
  category: 'tools',
  description: 'Mark yourself as away. Auto-clears when you next speak.',
  usage: 'afk [reason]',
  async run({ sock, msg, text }) {
    afkRepo.set(msg.senderNumber, text || 'AFK');
    await reply(sock, msg, `😴 You are now AFK: *${text || 'AFK'}*`);
  },
};

export default afk;
