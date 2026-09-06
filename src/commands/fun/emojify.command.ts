import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

/** Turn letters into 🇦-🇿 regional-indicator emojis and digits into keycaps. */
function emojify(input: string): string {
  const digits = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
  return input
    .toLowerCase()
    .split('')
    .map((c) => {
      if (c >= 'a' && c <= 'z') {
        return String.fromCodePoint(0x1f1e6 + (c.charCodeAt(0) - 97)) + ' ';
      }
      if (c >= '0' && c <= '9') return digits[+c] + ' ';
      if (c === ' ') return '   ';
      return c + ' ';
    })
    .join('');
}

const emojifyCmd: Command = {
  name: 'emojify',
  aliases: ['emojitext', 'bigtext'],
  category: 'fun',
  description: 'Turn text into big regional-indicator emoji letters.',
  usage: 'emojify <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *emojify <text>*');
      return;
    }
    if (input.length > 100) {
      await reply(sock, msg, '❌ Keep it under 100 characters.');
      return;
    }
    await reply(sock, msg, emojify(input));
  },
};

export default emojifyCmd;
