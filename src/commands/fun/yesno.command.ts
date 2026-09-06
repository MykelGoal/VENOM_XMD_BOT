import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'yesno',
  aliases: ["decide2","yn"],
  category: 'fun',
  description: "Simple yes/no/maybe answer.",
  usage: 'yesno <question>',
  async run({ sock, msg, text, args }) {
    const a = ['Yes 👍','No 👎','Maybe 🤷','Definitely ✅','Absolutely not ❌'];
    await reply(sock, msg, a[Math.floor(Math.random() * a.length)]);
  },
};

export default command;
