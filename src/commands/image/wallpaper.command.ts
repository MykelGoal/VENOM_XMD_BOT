import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { wallpapers } from '../../services/imagesearch.service';

const wallpaper: Command = {
  name: 'wallpaper',
  aliases: ['wall', 'wp'],
  category: 'image',
  description: 'Search and send HD wallpapers (SFW).',
  usage: 'wallpaper <query>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *wallpaper <query>*\n\nExample: _wallpaper nature_');
      return;
    }
    await react(sock, msg, '🔎');
    try {
      const list = await wallpapers(text, 4);
      for (const w of list) {
        await sock.sendMessage(
          msg.chat,
          { image: { url: w.url }, caption: `🖼️ ${text} • ${w.resolution}` },
          { quoted: msg.raw },
        );
      }
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, `❌ No wallpapers found for "${text}".`);
    }
  },
};

export default wallpaper;
