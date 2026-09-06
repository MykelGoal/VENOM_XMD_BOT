import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { accessRepo } from '../../database/repositories/access.repo';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const unignore: Command = {
  name: 'unignore',
  category: 'bot',
  description: 'Stop ignoring a user.',
  usage: 'unignore @user',
  ownerOnly: true,
  async run({ sock, msg }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : undefined);
    if (!target) {
      await reply(sock, msg, 'ℹ️ Mention or reply to the user.');
      return;
    }
    const num = jidToNumber(target);
    const ok = accessRepo.remove(num, 'ignored');
    await reply(sock, msg, ok ? `👀 No longer ignoring ${num}.` : `❌ ${num} wasn't ignored.`);
  },
};

export default unignore;
