import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import {
  generateImage,
  imageGenerationConfigured,
} from '../../services/image-generation.service';
import { isSudo } from '../../middleware/permission';

const userCooldown = new Map<string, number>();
const groupCooldown = new Map<string, number>();
const USER_WAIT_MS = 2 * 60_000;
const GROUP_WAIT_MS = 5 * 60_000;

const imagine: Command = {
  name: 'imagine',
  aliases: ['draw', 'genimage', 'createimage'],
  category: 'image',
  description: 'Generate an original image through a configured first-party provider.',
  usage: 'imagine <clear image description>',
  async run({ sock, msg, text }) {
    const prompt = text.trim();
    if (prompt.length < 5) {
      await reply(sock, msg, 'ℹ️ Describe the image you want. Example: *.imagine cinematic Free Fire tournament poster in red and black*');
      return;
    }
    if (!imageGenerationConfigured()) {
      await reply(
        sock,
        msg,
        '❌ Image generation is not configured. The owner can privately set a *Gemini* or *OpenAI* key with `.setkey`.',
      );
      return;
    }

    const now = Date.now();
    if (!isSudo(msg.senderNumber)) {
      const userWait = (userCooldown.get(msg.senderNumber) ?? 0) - now;
      const groupWait = msg.isGroup ? (groupCooldown.get(msg.chat) ?? 0) - now : 0;
      const wait = Math.max(userWait, groupWait);
      if (wait > 0) {
        await reply(sock, msg, `⏳ Image generation is on cooldown. Try again in ${Math.ceil(wait / 60_000)} minute(s).`);
        return;
      }
    }

    await react(sock, msg, '🎨');
    try {
      const result = await generateImage(prompt);
      userCooldown.set(msg.senderNumber, now + USER_WAIT_MS);
      if (msg.isGroup) groupCooldown.set(msg.chat, now + GROUP_WAIT_MS);
      await sock.sendMessage(
        msg.chat,
        {
          image: result.image,
          caption: `🎨 ${prompt.slice(0, 300)}\n_${result.provider} · ${result.model}_`,
        },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      const code = (err as Error)?.message ?? '';
      const message =
        code === 'IMAGE_PROMPT_UNSAFE'
          ? '🚫 I can’t generate payment proof, forged identity documents or similar deceptive records.'
          : code === 'IMAGE_NOT_CONFIGURED'
            ? '❌ No legitimate image-generation provider is configured.'
            : '❌ The configured image provider could not generate that image. No fake result was returned; try again later or adjust the prompt.';
      await reply(sock, msg, message);
    }
  },
};

export default imagine;
