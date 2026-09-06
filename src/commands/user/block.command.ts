import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const block: Command = {
  name: 'block',
  category: 'user',
  description: 'Block a user (mention, reply, or in their DM).',
  usage: 'block [@user]',
  ownerOnly: true,
  async run({ sock, msg }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : !msg.isGroup ? msg.chat : undefined);
    if (!target) {
      await reply(sock, msg, 'ℹ️ Mention/reply to a user, or use in their DM.');
      return;
    }
    await sock.updateBlockStatus(target, 'block');
    await reply(sock, msg, `🚫 Blocked ${jidToNumber(target)}.`);
  },
};

export default block;
