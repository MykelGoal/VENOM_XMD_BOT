import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { commands } from '../index';
import { env, META } from '../../config';

const info: Command = {
  name: 'info',
  aliases: ['about', 'owner'],
  category: 'general',
  description: 'Information about the bot.',
  usage: 'info',
  async run({ sock, msg }) {
    const text = [
      `🕷️ *${env.botName}*`,
      '',
      'A modular WhatsApp bot built with Baileys + TypeScript.',
      '',
      `📦 Version: ${META.version}`,
      `🧩 Commands: ${commands.size}`,
      `👤 Author: ${META.author}`,
      `🔗 Repo: ${META.repo}`,
    ].join('\n');
    await reply(sock, msg, text);
  },
};

export default info;
