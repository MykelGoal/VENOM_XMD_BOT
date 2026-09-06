import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** dictionaryapi.dev — free, no key. */
const define: Command = {
  name: 'define',
  aliases: ['dict', 'dictionary'],
  category: 'tools',
  description: 'Get the dictionary definition of a word.',
  usage: 'define <word>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *define <word>*');
      return;
    }
    try {
      const arr = await fetchJson<any[]>(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text.trim())}`,
      );
      const entry = arr[0];
      const lines: string[] = [`📘 *${entry.word}*`];
      if (entry.phonetic) lines.push(`_${entry.phonetic}_`);
      lines.push('');
      for (const m of entry.meanings.slice(0, 2)) {
        lines.push(`*${m.partOfSpeech}*`);
        for (const d of m.definitions.slice(0, 2)) {
          lines.push(`• ${d.definition}`);
        }
        lines.push('');
      }
      await reply(sock, msg, lines.join('\n').trim());
    } catch {
      await reply(sock, msg, `❌ No definition found for "${text}".`);
    }
  },
};

export default define;
