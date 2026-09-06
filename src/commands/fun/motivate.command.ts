import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LIST = [
  "Discipline beats motivation. Show up anyway.",
  "Small steps every day beat giant leaps once a year.",
  "You didn't come this far to only come this far.",
  "Fall seven times, stand up eight.",
  "Your future is created by what you do today.",
  "Dream big. Start small. Act now.",
  "Progress, not perfection.",
  "The comeback is always stronger than the setback."
];

const command: Command = {
  name: 'motivate',
  aliases: ["motivation","motivateme"],
  category: 'fun',
  description: "Get a motivational quote.",
  usage: 'motivate',
  async run({ sock, msg }) {
    const pick = LIST[Math.floor(Math.random() * LIST.length)];
    await reply(sock, msg, "🔥 " + pick);
  },
};

export default command;
