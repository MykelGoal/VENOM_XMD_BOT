import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const clearchat: Command = {
  name: 'clearchat',
  aliases: ['clear', 'wipechat'],
  category: 'user',
  description: 'Clear all messages in the current chat (for the bot account).',
  usage: 'clearchat',
  ownerOnly: true,
  async run({ sock, msg }) {
    try {
      await sock.chatModify(
        {
          clear: true,
          lastMessages: [{ key: msg.raw.key, messageTimestamp: msg.raw.messageTimestamp }],
        } as any,
        msg.chat,
      );
      await reply(sock, msg, '🧹 Chat cleared.');
    } catch {
      await reply(sock, msg, '⚠️ Could not clear this chat.');
    }
  },
};

export default clearchat;
