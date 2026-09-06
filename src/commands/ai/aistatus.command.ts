import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { configuredProviders, isAIConfigured } from '../../services/ai.service';
import { env } from '../../config';

/** Shows which AI providers are configured and the fallback order. */
const aistatus: Command = {
  name: 'aistatus',
  aliases: ['aiproviders', 'aiinfo'],
  category: 'ai',
  description: 'Show which AI providers are configured and their fallback order.',
  usage: 'aistatus',
  ownerOnly: true,
  async run({ sock, msg }) {
    const active = configuredProviders();
    const all = ['deepseek', 'gemini', 'openrouter', 'groq', 'openai'];

    const lines = [
      '🤖 *VENOM AI — Provider Status*',
      '',
      isAIConfigured()
        ? `✅ Active (${active.length}): *${active.join(' → ')}*`
        : '❌ No providers configured yet.',
      '',
      '*All providers:*',
      ...all.map(
        (p) => `${active.includes(p) ? '🟢' : '⚪'} ${p}`,
      ),
      '',
      `🔁 Fallback order: ${env.ai.order.join(', ')}`,
      '',
      '_Add keys in your host dashboard / .env (never in code):_',
      '_DEEPSEEK_API_KEY · GEMINI_API_KEY · OPENROUTER_API_KEY · GROQ_API_KEY · AI_API_KEY_',
    ];

    await reply(sock, msg, lines.join('\n'));
  },
};

export default aistatus;
