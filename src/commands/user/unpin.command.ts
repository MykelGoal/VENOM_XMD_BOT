import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const unpin: Command = {
  name: 'unpin',
  aliases: ['unpinchat'],
  category: 'user',
  description: 'Unpin the current chat.',
  usage: 'unpin',
  ownerOnly: true,
  async run({ sock, msg }) {
    try {
      await sock.chatModify({ pin: false }, msg.chat);
      await reply(sock, msg, '📌 Chat unpinned.');
    } catch {
      await reply(sock, msg, '⚠️ Could not unpin this chat.');
    }
  },
};

export default unpin;
