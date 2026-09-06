import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { makeTextImage } from '../../services/textmaker.service';
import type { TextStyle } from '../../services/textmaker.service';

interface TextMakerOptions {
  name: string;
  aliases?: string[];
  style: TextStyle;
  description?: string;
}

/** Builds a stylized-text-image command (local SVG render, no API). */
export function makeTextMaker(opts: TextMakerOptions): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: 'textmaker',
    description:
      opts.description ?? `Create "${opts.name}" styled text.`,
    usage: `${opts.name} <text>`,
    async run({ sock, msg, text }) {
      if (!text) {
        await reply(sock, msg, `ℹ️ Usage: *${opts.name} <text>*`);
        return;
      }
      await react(sock, msg, '⏳');
      try {
        const img = await makeTextImage(opts.style, text);
        await sock.sendMessage(
          msg.chat,
          { image: img, caption: `✨ ${opts.name}` },
          { quoted: msg.raw },
        );
        await react(sock, msg, '✅');
      } catch {
        await react(sock, msg, '❌');
        await reply(sock, msg, '❌ Could not render that text.');
      }
    },
  };
}
