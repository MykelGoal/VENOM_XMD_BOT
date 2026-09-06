import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const setname: Command = {
  name: 'setname',
  aliases: ['setbotname'],
  category: 'user',
  description: "Change the bot account's display name.",
  usage: 'setname <new name>',
  ownerOnly: true,
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *setname <new name>*');
      return;
    }
    await sock.updateProfileName(text);
    await reply(sock, msg, `✅ Display name changed to *${text}*.`);
  },
};

export default setname;
