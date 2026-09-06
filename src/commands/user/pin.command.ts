import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const pin: Command = {
  name: 'pin',
  aliases: ['pinchat'],
  category: 'user',
  description: 'Pin the current chat to the top.',
  usage: 'pin',
  ownerOnly: true,
  async run({ sock, msg }) {
    try {
      await sock.chatModify({ pin: true }, msg.chat);
      await reply(sock, msg, '📌 Chat pinned.');
    } catch {
      await reply(sock, msg, '⚠️ Could not pin this chat.');
    }
  },
};

export default pin;
