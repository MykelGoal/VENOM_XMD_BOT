import axios from 'axios';
import { env } from '../config';
import { logger } from '../utils/logger';

/**
 * AI reply service. Two providers supported:
 *   - "openai"  → any OpenAI-compatible chat API (OpenAI, Groq, OpenRouter…)
 *   - "gemini"  → Google Gemini (generativelanguage API)
 *
 * Pick one with AI_PROVIDER in .env and set the matching key.
 */

export interface AIReplyOptions {
  prompt: string;
  system?: string;
}

const DEFAULT_SYSTEM =
  `You are ${env.botName}, a helpful, witty WhatsApp assistant. ` +
  'Keep replies concise and friendly. Use emojis sparingly.';

export function isAIConfigured(): boolean {
  if (env.ai.provider === 'gemini') return Boolean(env.ai.gemini.apiKey);
  return Boolean(env.ai.apiKey);
}

export async function getAIReply(opts: AIReplyOptions): Promise<string> {
  if (!isAIConfigured()) {
    const key =
      env.ai.provider === 'gemini' ? 'GEMINI_API_KEY' : 'AI_API_KEY';
    return `🤖 AI is not configured. Add ${key} to your .env file.`;
  }

  try {
    return env.ai.provider === 'gemini'
      ? await geminiReply(opts)
      : await openAIReply(opts);
  } catch (err) {
    const detail = axios.isAxiosError(err)
      ? `${err.response?.status ?? ''} ${JSON.stringify(err.response?.data ?? err.message)}`
      : String(err);
    logger.error({ detail }, 'AI request failed');
    return '⚠️ AI request failed. Check your API key, model, and base URL.';
  }
}

async function openAIReply(opts: AIReplyOptions): Promise<string> {
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
  return (
    data?.choices?.[0]?.message?.content?.trim() ??
    '🤖 (no response from the model)'
  );
}

async function geminiReply(opts: AIReplyOptions): Promise<string> {
  const model = env.ai.gemini.model;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:generateContent?key=${env.ai.gemini.apiKey}`;

  const { data } = await axios.post(
    url,
    {
      systemInstruction: {
        parts: [{ text: opts.system ?? DEFAULT_SYSTEM }],
      },
      contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 60_000 },
  );

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim();
  return text || '🤖 (no response from Gemini)';
}
