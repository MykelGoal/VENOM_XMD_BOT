import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "Birds aren't real — they're government surveillance drones.",
  "The moon is just a hologram to keep the tides polite.",
  "Autocorrect is slowly teaching us a new language.",
  "Socks disappear in the dryer because it's a portal to a sock dimension.",
  "Wi-Fi routers are secretly cats' favorite napping spots for a reason.",
  "Mondays were invented to sell more coffee."
];

const command: Command = {
  name: 'conspiracy',
  aliases: ["conspiracytheory"],
  category: 'fun',
  description: "A silly conspiracy theory.",
  usage: 'conspiracy',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "👽 " + pick);
  },
};

export default command;
