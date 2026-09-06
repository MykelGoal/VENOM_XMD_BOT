import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

const FALLBACK: { content: string; author: string }[] = [
  { content: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { content: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { content: 'Believe you can and you are halfway there.', author: 'Theodore Roosevelt' },
  { content: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { content: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { content: 'Do not watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
  { content: 'Whether you think you can or you think you cannot, you are right.', author: 'Henry Ford' },
  { content: 'Hard work beats talent when talent does not work hard.', author: 'Tim Notke' },
];

const quote: Command = {
  name: 'quote',
  aliases: ['inspire'],
  category: 'fun',
  description: 'Get a random inspirational quote.',
  usage: 'quote',
  async run({ sock, msg }) {
    let q = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    try {
      const data = await fetchJson<{ content: string; author: string }>(
        'https://api.quotable.io/random',
      );
      if (data?.content) q = data;
    } catch {
      /* keep the built-in fallback */
    }
    await reply(sock, msg, `💬 "${q.content}"\n\n— *${q.author}*`);
  },
};

export default quote;
