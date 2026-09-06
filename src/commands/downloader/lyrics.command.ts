import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { lyrics } from '../../services/download.service';

const lyricsCmd: Command = {
  name: 'lyrics',
  aliases: ['lyric', 'lyr'],
  category: 'downloader',
  description: 'Fetch the lyrics of a song.',
  usage: 'lyrics <song title>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *lyrics <song title>*\n\nExample: _lyrics faded alan walker_');
      return;
    }
    await react(sock, msg, '🔎');
    try {
      const l = await lyrics(text);
      const header = `🎼 *${l.title}*${l.artist ? `\n👤 ${l.artist}` : ''}\n\n`;
      let body = l.lyrics.trim();
      // WhatsApp practical text cap
      if ((header + body).length > 4000) {
        body = body.slice(0, 4000 - header.length) + '\n\n… _(truncated)_';
      }
      await reply(sock, msg, header + body);
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, `❌ No lyrics found for "${text}".`);
    }
  },
};

export default lyricsCmd;
