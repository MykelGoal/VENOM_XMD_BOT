import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const setbio: Command = {
  name: 'setbio',
  aliases: ['bio', 'setstatus'],
  category: 'user',
  description: "Change the bot account's about/bio.",
  usage: 'setbio <text>',
  ownerOnly: true,
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *setbio <text>*');
      return;
    }
    await sock.updateProfileStatus(text);
    await reply(sock, msg, '✅ Bio updated.');
  },
};

export default setbio;
