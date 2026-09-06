import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'magicdate',
  aliases: ["shipdate"],
  category: 'fun',
  description: "Suggest a random fun date idea.",
  usage: 'magicdate',
  async run({ sock, msg, text, args }) {
    const ideas = ['a picnic in the park','stargazing on a rooftop','a cooking challenge at home','a spontaneous road trip','a museum then coffee','a beach walk at sunset','a board-game night','baking cookies together'];
    await reply(sock, msg, '💌 How about ' + ideas[Math.floor(Math.random()*ideas.length)] + '?');
  },
};

export default command;
