import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { getAIReply } from '../../services/ai.service';

const translate: Command = {
  name: 'translate',
  aliases: ['tr', 'trt'],
  category: 'ai',
  description: 'Translate text into a target language.',
  usage: 'translate <lang> <text>  (or reply to a message)',
  async run({ sock, msg, args }) {
    const lang = args[0];
    const rest = args.slice(1).join(' ') || msg.quoted?.body;
    if (!lang || !rest) {
      await reply(
        sock,
        msg,
        'ℹ️ Usage: *translate <language> <text>*\ne.g. `translate french Hello there`',
      );
      return;
    }
    const answer = await getAIReply({
      system: 'You are a precise translator. Reply with ONLY the translation, no notes.',
      prompt: `Translate the following into ${lang}:\n\n${rest}`,
    });
    await reply(sock, msg, answer);
  },
};

export default translate;
