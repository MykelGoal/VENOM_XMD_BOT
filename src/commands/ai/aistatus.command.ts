import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import {
  configuredProviders,
  isAIConfigured,
  providerCooldownSeconds,
} from '../../services/ai.service';
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
        ? `✅ Configured (${active.length}): *${active.join(' → ')}*`
        : '❌ No providers configured yet.',
      '',
      '*All providers:*',
      ...all.map((p) => {
        const cooldown = providerCooldownSeconds(p);
        if (active.includes(p) && cooldown > 0) {
          return `🟡 ${p} — cooling down ~${Math.max(1, Math.ceil(cooldown / 60))}m`;
        }
        return `${active.includes(p) ? '🟢' : '⚪'} ${p}`;
      }),
      '',
      `🔁 Fallback order: ${env.ai.order.join(', ')}`,
      '',
      '_Add keys instantly with_ `.setkey <provider> <key>` _or in your host dashboard / .env_',
    ];

    await reply(sock, msg, lines.join('\n'));
  },
};

export default aistatus;
