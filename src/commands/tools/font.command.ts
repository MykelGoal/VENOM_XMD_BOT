import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

/** Offline fancy-text generator (Unicode). No API needed. */
const MAPS: Record<string, (c: string) => string> = {
  bold: (c) => shift(c, 0x1d400, 0x1d41a),
  italic: (c) => shift(c, 0x1d434, 0x1d44e),
  monospace: (c) => shift(c, 0x1d670, 0x1d68a),
  doublestruck: (c) => shift(c, 0x1d538, 0x1d552),
};

function shift(ch: string, upperBase: number, lowerBase: number): string {
  const code = ch.charCodeAt(0);
  if (code >= 65 && code <= 90)
    return String.fromCodePoint(upperBase + (code - 65));
  if (code >= 97 && code <= 122)
    return String.fromCodePoint(lowerBase + (code - 97));
  return ch;
}

const font: Command = {
  name: 'font',
  aliases: ['fancy'],
  category: 'tools',
  description: 'Convert text into fancy Unicode fonts.',
  usage: 'font <text>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *font <text>*');
      return;
    }
    const out = Object.entries(MAPS)
      .map(
        ([name, fn]) =>
          `*${name}:* ${[...text].map((c) => fn(c)).join('')}`,
      )
      .join('\n');
    await reply(sock, msg, out);
  },
};

export default font;
