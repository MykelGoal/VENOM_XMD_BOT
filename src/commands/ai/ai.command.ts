import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { getAIReply } from '../../services/ai.service';

const ai: Command = {
  name: 'ai',
  aliases: ['gpt', 'ask', 'bot'],
  category: 'ai',
  description: 'Ask the AI assistant anything.',
  usage: 'ai <your question>',
  async run({ sock, msg, text }) {
    const prompt = text || msg.quoted?.body;
    if (!prompt) {
      await reply(sock, msg, 'ℹ️ Usage: *ai <your question>*');
      return;
    }
    await react(sock, msg, '🤖');
    const answer = await getAIReply({ prompt });
    await reply(sock, msg, answer);
  },
};

export default ai;
