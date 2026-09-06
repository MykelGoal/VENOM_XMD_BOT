import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { characterInfo } from '../../services/anime.service';

const character: Command = {
  name: 'character',
  aliases: ['char', 'animechar'],
  category: 'anime',
  description: 'Look up an anime/manga character.',
  usage: 'character <name>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *character <name>*\n\nExample: _character goku_');
      return;
    }
    await react(sock, msg, '🔎');
    try {
      const c = await characterInfo(text);
      const caption = [
        `👤 *${c.name}*`,
        c.japanese ? `🇯🇵 ${c.japanese}` : '',
        '',
        `📝 ${c.description.slice(0, 700)}`,
      ]
        .filter(Boolean)
        .join('\n');
      if (c.image) {
        await sock.sendMessage(
          msg.chat,
          { image: { url: c.image }, caption },
          { quoted: msg.raw },
        );
      } else {
        await reply(sock, msg, caption);
      }
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, `❌ No character found for "${text}".`);
    }
  },
};

export default character;
