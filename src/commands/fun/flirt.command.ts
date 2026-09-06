import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'flirt',
  aliases: ["flirtline"],
  category: 'fun',
  description: "Get a smooth flirty line.",
  usage: 'flirt',
  async run({ sock, msg, text, args }) {
    const lines = ["Are you a magician? Because whenever I look at you, everyone else disappears.","Do you have a map? I keep getting lost in your eyes.","Is your name Wi-Fi? Because I'm feeling a connection.","If beauty were time, you'd be eternity.","Are you a parking ticket? Because you've got fine written all over you."];
    await reply(sock, msg, '😏 ' + lines[Math.floor(Math.random()*lines.length)]);
  },
};

export default command;
