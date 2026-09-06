import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'vowels',
  aliases: ["countvowels"],
  category: 'tools',
  description: "Count the vowels in the text.",
  usage: 'vowels <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *vowels <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => `🅰️ Vowels: *${(text.match(/[aeiou]/gi)||[]).length}*`)(text2);
    await reply(sock, msg, out);
  },
};

export default command;
