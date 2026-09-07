import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia } from '../../services/media.service';
import { analyzeImage, isVisionConfigured } from '../../services/ai.service';

function targetMime(raw: any): string {
  const q =
    raw.message?.extendedTextMessage?.contextInfo?.quotedMessage ?? raw.message;
  return q?.imageMessage?.mimetype || 'image/jpeg';
}

/**
 * Ask an AI vision model about an image.
 *   .vision              → describe the image
 *   .vision what breed?  → answer a specific question about it
 */
const vision: Command = {
  name: 'vision',
  aliases: ['seeimg', 'describe', 'analyze', 'whatisthis', 'imgai'],
  category: 'ai',
  description: 'Ask an AI vision model to describe or answer questions about an image.',
  usage: 'vision [question] (reply to / attach an image)',
  async run({ sock, msg, text }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'imageMessage') {
      await reply(
        sock,
        msg,
        'ℹ️ Reply to (or send) an image with *vision*.\n\n' +
          '• `.vision` – describe the image\n' +
          '• `.vision what breed is this dog?` – ask a question',
      );
      return;
    }

    if (!isVisionConfigured()) {
      await reply(
        sock,
        msg,
        '❌ Image understanding needs a vision-capable AI key ' +
          '(Gemini, OpenAI, or OpenRouter).\n' +
          'Set e.g. `GEMINI_API_KEY` or use `.setkey gemini <key>`.',
      );
      return;
    }

    const prompt =
      text.trim() ||
      'Describe this image in detail. Mention the main subject, setting, colours, and anything notable.';

    await react(sock, msg, '👁️');
    try {
      const buf = await downloadMedia(target.raw);
      const answer = await analyzeImage(buf, prompt, targetMime(target.raw));
      if (!answer) {
        await react(sock, msg, '❌');
        await reply(sock, msg, "🤷 The model couldn't produce a response for that image.");
        return;
      }
      await react(sock, msg, '✅');
      await reply(sock, msg, `👁️ *Vision:*\n\n${answer}`);
    } catch (err) {
      await react(sock, msg, '❌');
      const t =
        (err as Error)?.message === 'NO_VISION'
          ? '❌ No vision-capable AI key configured.'
          : '❌ Could not analyse that image. Try again shortly.';
      await reply(sock, msg, t);
    }
  },
};

export default vision;
