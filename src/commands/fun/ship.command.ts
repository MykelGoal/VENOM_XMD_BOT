import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { numberToJid } from '../../utils/helpers';

const ship: Command = {
  name: 'ship',
  aliases: ['lovematch'],
  category: 'fun',
  description: 'Ship two people and rate their love match.',
  usage: 'ship @user1 @user2',
  async run({ sock, msg }) {
    const percent = Math.floor(Math.random() * 101);
    const bar =
      '█'.repeat(Math.round(percent / 10)) +
      '░'.repeat(10 - Math.round(percent / 10));
    const targets = msg.mentions.slice(0, 2);
    const label =
      targets.length === 2
        ? `@${targets[0].split('@')[0]} 💞 @${targets[1].split('@')[0]}`
        : 'You two';
    await sock.sendMessage(
      msg.chat,
      {
        text: `💘 *Ship Result*\n\n${label}\n\n${bar} ${percent}%`,
        mentions: targets,
      },
      { quoted: msg.raw },
    );
  },
};

export default ship;
