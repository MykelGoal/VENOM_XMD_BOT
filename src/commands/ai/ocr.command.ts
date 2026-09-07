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
 * Extract text from an image (OCR) using an AI vision model.
 *   .ocr   (reply to an image containing text)
 */
const ocr: Command = {
  name: 'ocr',
  aliases: ['readtext', 'extracttext', 'img2text', 'scan'],
  category: 'ai',
  description: 'Extract / read the text inside an image (OCR via AI vision).',
  usage: 'ocr (reply to an image with text)',
  async run({ sock, msg }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'imageMessage') {
      await reply(sock, msg, 'ℹ️ Reply to an image containing text with *ocr*.');
      return;
    }

    if (!isVisionConfigured()) {
      await reply(
        sock,
        msg,
        '❌ OCR needs a vision-capable AI key (Gemini, OpenAI, or OpenRouter).\n' +
          'Set e.g. `GEMINI_API_KEY` or use `.setkey gemini <key>`.',
      );
      return;
    }

    await react(sock, msg, '🔎');
    try {
      const buf = await downloadMedia(target.raw);
      const prompt =
        'Extract ALL text visible in this image exactly as written. ' +
        'Preserve line breaks and order. Output ONLY the text, with no ' +
        'commentary. If there is no readable text, reply exactly: NO_TEXT_FOUND';
      const out = await analyzeImage(buf, prompt, targetMime(target.raw));

      if (!out || /^NO_TEXT_FOUND$/i.test(out.trim())) {
        await react(sock, msg, '❌');
        await reply(sock, msg, '🤷 No readable text found in that image.');
        return;
      }
      await react(sock, msg, '✅');
      await reply(sock, msg, `🔎 *Extracted text:*\n\n${out}`);
    } catch (err) {
      await react(sock, msg, '❌');
      const t =
        (err as Error)?.message === 'NO_VISION'
          ? '❌ No vision-capable AI key configured.'
          : '❌ Could not read text from that image. Try again shortly.';
      await reply(sock, msg, t);
    }
  },
};

export default ocr;
