import axios from 'axios';
import { env } from '../config';
import { logger } from '../utils/logger';

/**
 * AI reply service — works with any OpenAI-compatible chat API
 * (OpenAI, Groq, OpenRouter, Together, LocalAI, etc.). Just set
 * AI_API_KEY, AI_MODEL and AI_BASE_URL in .env.
 */

export interface AIReplyOptions {
  prompt: string;
  system?: string;
}

const DEFAULT_SYSTEM =
  `You are ${env.botName}, a helpful, witty WhatsApp assistant. ` +
  'Keep replies concise and friendly. Use emojis sparingly.';

export function isAIConfigured(): boolean {
  return Boolean(env.ai.apiKey);
}

export async function getAIReply(opts: AIReplyOptions): Promise<string> {
  if (!isAIConfigured()) {
    return '🤖 AI is not configured. Add AI_API_KEY to your .env file.';
  }

  try {
    const { data } = await axios.post(
      `${env.ai.baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        model: env.ai.model,
        messages: [
          { role: 'system', content: opts.system ?? DEFAULT_SYSTEM },
          { role: 'user', content: opts.prompt },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.ai.apiKey}`,
        },
        timeout: 60_000,
      },
    );

    const reply =
      data?.choices?.[0]?.message?.content?.trim() ??
      '🤖 (no response from the model)';
    return reply;
  } catch (err) {
    const detail = axios.isAxiosError(err)
      ? `${err.response?.status ?? ''} ${JSON.stringify(err.response?.data ?? err.message)}`
      : String(err);
    logger.error({ detail }, 'AI request failed');
    return '⚠️ AI request failed. Check your API key, model, and base URL.';
  }
}
