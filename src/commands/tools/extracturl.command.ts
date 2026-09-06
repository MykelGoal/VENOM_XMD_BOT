import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'extracturl',
  aliases: ["geturls","urls"],
  category: 'tools',
  description: "Extract all URLs from text.",
  usage: 'extracturl <text>',
  async run({ sock, msg, text, args }) {
    const input = text || msg.quoted?.body || '';
    const urls = input.match(/https?:\/\/[^\s]+/g);
    await reply(sock, msg, urls ? '🔗 ' + urls.join('\n') : 'No URLs found.');
  },
};

export default command;
