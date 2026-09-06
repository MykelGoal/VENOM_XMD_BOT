import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'decide',
  aliases: ["decision"],
  category: 'fun',
  description: "Let the bot decide yes or no.",
  usage: 'decide <question>',
  async run({ sock, msg, text, args }) {
    if (!text) { await reply(sock, msg, 'ℹ️ Usage: *decide <question>*'); return; }
    const ans = ['Yes ✅','No ❌','Maybe 🤔','Absolutely 💯','Not a chance 🚫','Ask again later ⏳'];
    await reply(sock, msg, ans[Math.floor(Math.random()*ans.length)]);
  },
};

export default command;
