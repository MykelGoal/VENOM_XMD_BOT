import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'timestamp',
  aliases: ["unixtime","epoch"],
  category: 'tools',
  description: "Show the current Unix timestamp.",
  usage: 'timestamp',
  async run({ sock, msg, text, args }) {
    await reply(sock, msg, `🕐 ${Math.floor(Date.now()/1000)}`);
  },
};

export default command;
