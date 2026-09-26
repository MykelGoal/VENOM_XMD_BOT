import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { resolveYt, ytMp3, formatViews } from '../../services/download.service';
import { logger } from '../../utils/logger';
import { isSudo } from '../../middleware/permission';

const play: Command = {
  name: 'play',
  aliases: ['song', 'ytmp3', 'yta'],
  category: 'downloader',
  description: 'Search YouTube and send the audio (MP3) of the top result.',
  usage: 'play <song name or YouTube url>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *play <song name>*\n\nExample: _play alan walker faded_');
      return;
    }
    await react(sock, msg, '🔎');
    let dl: Awaited<ReturnType<typeof ytMp3>> | undefined;
    let stage = 'search';
    try {
      const v = await resolveYt(text);
      await reply(
        sock,
        msg,
        `🎵 *${v.title}*\n👤 ${v.author}\n⏱️ ${v.duration}  •  👁️ ${formatViews(v.views)}\n\n_Downloading audio…_`,
      );
      await react(sock, msg, '⏳');
      stage = 'download';
      dl = await ytMp3(v.url);
      stage = 'WhatsApp upload';
      await sock.sendMessage(
        msg.chat,
        {
          audio: { url: dl.url },
          mimetype: dl.mimetype || 'audio/mpeg',
          fileName: `${v.title}.mp3`.replace(/[\\/:*?"<>|]/g, ''),
        },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch (err) {
      logger.error({ err, stage, query: text }, '.play failed');
      await react(sock, msg, '❌');
      const ownerDetail = isSudo(msg.senderNumber)
        ? `\n\n🔧 Owner detail: ${String(err instanceof Error ? err.message : err)
            .replace(/:\/\/[^\s/@]+:[^\s/@]+@/g, '://***:***@')
            .slice(-700)}`
        : '';
      await reply(
        sock,
        msg,
        `❌ Could not fetch that song (${stage} failed). Please try again shortly.${ownerDetail}`,
      );
    } finally {
      await dl?.cleanup?.();
    }
  },
};

export default play;
