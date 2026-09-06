import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { mockCase } from '../../services/textutils.service';

const mock: Command = {
  name: 'mock',
  aliases: ['spongebob', 'mockcase'],
  category: 'fun',
  description: 'tRaNsFoRm TeXt InTo MoCkInG cAsE.',
  usage: 'mock <text>',
  async run({ sock, msg, text }) {
    const input = text || msg.quoted?.body || '';
    if (!input) {
      await reply(sock, msg, 'ℹ️ Usage: *mock <text>*');
      return;
    }
    await reply(sock, msg, `🧽 ${mockCase(input)}`);
  },
};

export default mock;
