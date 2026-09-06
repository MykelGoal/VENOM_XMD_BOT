import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const unblock: Command = {
  name: 'unblock',
  category: 'user',
  description: 'Unblock a user.',
  usage: 'unblock [@user]',
  ownerOnly: true,
  async run({ sock, msg }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : !msg.isGroup ? msg.chat : undefined);
    if (!target) {
      await reply(sock, msg, 'ℹ️ Mention/reply to a user, or use in their DM.');
      return;
    }
    await sock.updateBlockStatus(target, 'unblock');
    await reply(sock, msg, `✅ Unblocked ${jidToNumber(target)}.`);
  },
};

export default unblock;
