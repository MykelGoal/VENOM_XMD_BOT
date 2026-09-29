import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { getAIReplyWithTools } from '../../services/ai.service';
import {
  aiToolsSystemPrompt,
  buildAITools,
  buildToolExecutor,
  handleNaturalCommandRequest,
} from '../../services/ai-tools.service';

const ai: Command = {
  name: 'ai',
  aliases: ['gpt', 'ask', 'bot'],
  category: 'ai',
  description: 'Ask the AI assistant anything — it can even run commands for you.',
  usage: 'ai <your question or request>',
  async run({ sock, msg, text }) {
    const prompt = text || msg.quoted?.body;
    if (!prompt) {
      await reply(sock, msg, 'ℹ️ Usage: *ai <your question>*');
      return;
    }
    // Clear natural command requests should work even when the active AI
    // provider is weak at function calling or temporarily falls back.
    if (await handleNaturalCommandRequest(sock, msg, prompt)) return;

    await react(sock, msg, '🤖');
    // Show "typing…" so it feels responsive while the model generates.
    await sock.sendPresenceUpdate('composing', msg.chat).catch(() => {});
    const answer = await getAIReplyWithTools({
      prompt,
      tools: buildAITools(),
      execute: buildToolExecutor(sock, msg),
      toolsSystem: aiToolsSystemPrompt(),
    });
    await sock.sendPresenceUpdate('paused', msg.chat).catch(() => {});
    await reply(sock, msg, answer);
  },
};

export default ai;
