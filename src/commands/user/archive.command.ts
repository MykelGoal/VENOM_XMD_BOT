import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const archive: Command = {
  name: 'archive',
  aliases: ['archivechat'],
  category: 'user',
  description: 'Archive the current chat.',
  usage: 'archive',
  ownerOnly: true,
  async run({ sock, msg }) {
    try {
      await sock.chatModify(
        {
          archive: true,
          lastMessages: [{ key: msg.raw.key, messageTimestamp: msg.raw.messageTimestamp }],
        },
        msg.chat,
      );
      await reply(sock, msg, '🗄️ Chat archived.');
    } catch {
      await reply(sock, msg, '⚠️ Could not archive this chat.');
    }
  },
};

export default archive;
