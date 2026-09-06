import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

const FALLBACK: { reference: string; text: string }[] = [
  { reference: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
  { reference: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.' },
  { reference: 'Psalm 23:1', text: 'The LORD is my shepherd; I shall not want.' },
  { reference: 'Proverbs 3:5', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
  { reference: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
  { reference: 'Isaiah 41:10', text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God.' },
  { reference: 'Romans 8:28', text: 'And we know that all things work together for good to them that love God.' },
];

/** bible-api.com — free, no key. Falls back to a built-in list. */
const bible: Command = {
  name: 'bible',
  aliases: ['verse'],
  category: 'fun',
  description: 'Get a Bible verse (e.g. "bible John 3:16") or a random one.',
  usage: 'bible [reference]',
  async run({ sock, msg, text }) {
    const ref = text || 'random';
    try {
      const d = await fetchJson<any>(
        `https://bible-api.com/${encodeURIComponent(ref)}`,
      );
      if (!d.text) {
        await reply(sock, msg, `❌ Could not find "${ref}".`);
        return;
      }
      await reply(sock, msg, `📖 *${d.reference}*\n\n${d.text.trim()}`);
    } catch {
      // API down — if the user asked for a specific verse we can't fake it,
      // but a random request can still return a built-in verse.
      if (text) {
        await reply(sock, msg, '⚠️ Verse service is down. Try again shortly.');
        return;
      }
      const v = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
      await reply(sock, msg, `📖 *${v.reference}*\n\n${v.text}`);
    }
  },
};

export default bible;
