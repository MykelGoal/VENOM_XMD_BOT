import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const unarchive: Command = {
  name: 'unarchive',
  aliases: ['unarchivechat'],
  category: 'user',
  description: 'Unarchive the current chat.',
  usage: 'unarchive',
  ownerOnly: true,
  async run({ sock, msg }) {
    try {
      await sock.chatModify(
        {
          archive: false,
          lastMessages: [{ key: msg.raw.key, messageTimestamp: msg.raw.messageTimestamp }],
        },
        msg.chat,
      );
      await reply(sock, msg, '📤 Chat unarchived.');
    } catch {
      await reply(sock, msg, '⚠️ Could not unarchive this chat.');
    }
  },
};

export default unarchive;
