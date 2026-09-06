import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'convtemp',
  aliases: ["ctof","tempconv"],
  category: 'tools',
  description: "Convert temperature C↔F.",
  usage: 'temp <value><c|f>',
  async run({ sock, msg, text, args }) {
    const m = (args[0] || '').match(/^(-?\d+(?:\.\d+)?)\s*(c|f)$/i);
    if (!m) { await reply(sock, msg, 'ℹ️ Usage: *convtemp 25c*  or  *temp 77f*'); return; }
    const v = parseFloat(m[1]); const unit = m[2].toLowerCase();
    if (unit === 'c') await reply(sock, msg, `🌡️ ${v}°C = *${(v*9/5+32).toFixed(1)}°F*`);
    else await reply(sock, msg, `🌡️ ${v}°F = *${((v-32)*5/9).toFixed(1)}°C*`);
  },
};

export default command;
