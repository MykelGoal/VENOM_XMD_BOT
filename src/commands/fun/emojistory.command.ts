import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "🌧️➡️🌈 Every storm ends in color.",
  "👶➡️🧓 One life, many chapters.",
  "🌱💧☀️🌳 Patience grows great things.",
  "💤💡🚀 Dreams become launches.",
  "🐛🔜🦋 Change is beautiful.",
  "❤️➕⏰ Love takes time."
];

const command: Command = {
  name: 'emojistory',
  aliases: ["emojitale"],
  category: 'fun',
  description: "A tiny story told in emojis.",
  usage: 'emojistory',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "📖 " + pick);
  },
};

export default command;
