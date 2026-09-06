import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'palindrome',
  aliases: ["ispalindrome"],
  category: 'tools',
  description: "Check if text is a palindrome.",
  usage: 'palindrome <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *palindrome <text>* (or reply to a message)');
      return;
    }
    const text2 = input;
    const out = ((text) => (() => { const s=text.toLowerCase().replace(/[^a-z0-9]/g,''); return s===s.split('').reverse().join('') ? '✅ Yes, it is a palindrome!' : '❌ No, not a palindrome.'; })())(text2);
    await reply(sock, msg, out);
  },
};

export default command;
