import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "The road to nowhere is paved with detours you enjoyed.",
  "A closed door is just a wall with potential.",
  "You cannot pour from an empty cup, so buy a bigger cup.",
  "Silence is the loudest answer you'll ever hear.",
  "The early bird gets the worm, but the second mouse gets the cheese.",
  "Not all who wander are lost; some just forgot the map."
];

const command: Command = {
  name: 'wisequote',
  aliases: ["philosophy"],
  category: 'fun',
  description: "A deep-sounding fake-deep quote.",
  usage: 'wisequote',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "🌌 " + pick);
  },
};

export default command;
