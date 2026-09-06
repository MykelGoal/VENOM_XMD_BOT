import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'wordfreq',
  aliases: ["freq"],
  category: 'tools',
  description: "Count how often each word appears.",
  usage: 'wordfreq <text>',
  async run({ sock, msg, text, args }) {
    const input = text || msg.quoted?.body || '';
    if (!input) { await reply(sock, msg, 'ℹ️ Usage: *wordfreq <text>*'); return; }
    const map: Record<string, number> = {};
    for (const w of input.toLowerCase().match(/[a-z0-9']+/g) || []) map[w] = (map[w] || 0) + 1;
    const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!top.length) { await reply(sock, msg, 'No words found.'); return; }
    await reply(sock, msg, '📊 *Top words:*\n' + top.map(([w, c]) => `${w}: ${c}`).join('\n'));
  },
};

export default command;
