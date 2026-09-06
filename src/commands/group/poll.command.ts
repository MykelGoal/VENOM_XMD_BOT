import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const poll: Command = {
  name: 'poll',
  category: 'group',
  description: 'Create a poll. Separate the question and options with "|".',
  usage: 'poll Question | option1 | option2 | ...',
  groupOnly: true,
  async run({ sock, msg, text }) {
    const parts = text.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) {
      await reply(sock, msg, 'ℹ️ Usage: *poll Question | option1 | option2*');
      return;
    }
    const [question, ...options] = parts;
    await sock.sendMessage(msg.chat, {
      poll: { name: question, values: options.slice(0, 12), selectableCount: 1 },
    });
  },
};

export default poll;
