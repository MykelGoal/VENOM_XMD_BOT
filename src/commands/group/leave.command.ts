import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { sleep } from '../../utils/helpers';

const leave: Command = {
  name: 'leave',
  aliases: ['leavegc', 'exitgc'],
  category: 'group',
  description: 'Make the bot leave the group.',
  usage: 'leave',
  groupOnly: true,
  ownerOnly: true,
  async run({ sock, msg }) {
    await reply(sock, msg, '👋 Leaving the group. Goodbye!');
    await sleep(1000);
    await sock.groupLeave(msg.chat);
  },
};

export default leave;
