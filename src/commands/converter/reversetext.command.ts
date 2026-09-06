import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { reverseText } from '../../services/textutils.service';

const reversetext: Command = {
  name: 'reversetext',
  aliases: ['revtext', 'backwards'],
  category: 'converter',
  description: 'Reverse the characters of your text.',
  usage: 'reversetext <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *reversetext <text>*');
      return;
    }
    await reply(sock, msg, `🔄 ${reverseText(input)}`);
  },
};

export default reversetext;
