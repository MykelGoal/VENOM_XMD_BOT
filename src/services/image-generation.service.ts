import axios from 'axios';
import { env } from '../config';
import { effectiveAIKey } from './ai.service';
import { logger } from '../utils/logger';

export interface GeneratedImage {
  image: Buffer;
  provider: 'gemini' | 'openai';
  model: string;
}

const BLOCKED_PROMPT = /\b(?:bank|payment|transfer)\s+(?:receipt|alert|proof)|\b(?:fake|forged?)\s+(?:id|passport|receipt|certificate)|\b(?:passport|national id|driver'?s licence)\s+(?:template|copy)\b/i;

export function imageGenerationConfigured(): boolean {
  return Boolean(effectiveAIKey('gemini') || effectiveAIKey('openai'));
}

function cleanPrompt(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim().slice(0, 1800);
  if (cleaned.length < 5) throw new Error('IMAGE_PROMPT_REQUIRED');
  if (BLOCKED_PROMPT.test(cleaned)) throw new Error('IMAGE_PROMPT_UNSAFE');
  return cleaned;
}

async function generateWithGemini(prompt: string): Promise<GeneratedImage> {
  const key = effectiveAIKey('gemini');
  if (!key) throw new Error('NO_GEMINI_KEY');
  const model = 'gemini-3.1-flash-lite-image';
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    },
    {
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      timeout: 120_000,
      maxContentLength: 15 * 1024 * 1024,
    },
  );
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const encoded = parts.find((part: any) => part?.inlineData?.data)?.inlineData?.data;
  if (!encoded) throw new Error('NO_IMAGE_OUTPUT');
  return { image: Buffer.from(encoded, 'base64'), provider: 'gemini', model };
}

async function generateWithOpenAI(prompt: string): Promise<GeneratedImage> {
  const key = effectiveAIKey('openai');
  if (!key) throw new Error('NO_OPENAI_KEY');
  const model = 'gpt-image-1';
  const base = env.ai.baseUrl.replace(/\/+$/, '') || 'https://api.openai.com/v1';
  const { data } = await axios.post(
    `${base}/images/generations`,
    {
      model,
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
      output_format: 'png',
    },
    {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      timeout: 120_000,
      maxContentLength: 15 * 1024 * 1024,
    },
  );
  const encoded = data?.data?.[0]?.b64_json;
  if (encoded) return { image: Buffer.from(encoded, 'base64'), provider: 'openai', model };
  const url = data?.data?.[0]?.url;
  if (!url) throw new Error('NO_IMAGE_OUTPUT');
  const downloaded = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 45_000,
    maxContentLength: 15 * 1024 * 1024,
  });
  return { image: Buffer.from(downloaded.data), provider: 'openai', model };
}

/** Generate through legitimate first-party APIs, with outage fallback only. */
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const safe = cleanPrompt(prompt);
  const providers = [
    effectiveAIKey('gemini') ? generateWithGemini : undefined,
    effectiveAIKey('openai') ? generateWithOpenAI : undefined,
  ].filter(Boolean) as Array<(value: string) => Promise<GeneratedImage>>;
  if (!providers.length) throw new Error('IMAGE_NOT_CONFIGURED');

  let lastError: unknown;
  for (const provider of providers) {
    try {
      return await provider(safe);
    } catch (err) {
      lastError = err;
      logger.warn(
        {
          provider: provider === generateWithGemini ? 'gemini' : 'openai',
          status: axios.isAxiosError(err) ? err.response?.status : undefined,
        },
        'Image generation provider failed; trying the configured fallback',
      );
    }
  }
  throw lastError instanceof Error ? lastError : new Error('IMAGE_GENERATION_FAILED');
}
