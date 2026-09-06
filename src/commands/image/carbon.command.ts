import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { carbonImage } from '../../services/imagesearch.service';

const carbon: Command = {
  name: 'carbon',
  aliases: ['carbonify', 'code2img'],
  category: 'image',
  description: 'Turn a code snippet into a beautiful carbon-style image.',
  usage: 'carbon <code>  (or reply to a code message)',
  async run({ sock, msg, text }) {
    const code = text || msg.quoted?.body || '';
    if (!code.trim()) {
      await reply(
        sock,
        msg,
        'ℹ️ Usage: *carbon <code>*\n\nOr reply to a message containing code with *carbon*.',
      );
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const img = await carbonImage(code);
      await sock.sendMessage(
        msg.chat,
        { image: img, caption: '🖥️ Your code, beautified.' },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '⚠️ Could not generate the carbon image right now.');
    }
  },
};

export default carbon;
