import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { accessRepo } from '../../database/repositories/access.repo';
import { numberToJid, jidToNumber } from '../../utils/helpers';

const ignore: Command = {
  name: 'ignore',
  category: 'bot',
  description: 'Make the bot ignore all commands from a user.',
  usage: 'ignore @user',
  ownerOnly: true,
  async run({ sock, msg }) {
    const target =
      msg.mentions[0] ??
      (msg.quoted ? numberToJid(msg.quoted.senderNumber) : undefined);
    if (!target) {
      await reply(sock, msg, 'ℹ️ Mention or reply to the user to ignore.');
      return;
    }
    const num = jidToNumber(target);
    accessRepo.add(num, 'ignored');
    await reply(sock, msg, `🙈 Now ignoring ${num}.`);
  },
};

export default ignore;
