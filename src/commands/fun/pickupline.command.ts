import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const LINES = [
  'Are you a magician? Because whenever I look at you, everyone else disappears.',
  'Do you have a map? I keep getting lost in your eyes.',
  'Are you Wi-Fi? Because I’m feeling a connection.',
  'If you were a vegetable, you’d be a cute-cumber.',
  'Do you believe in love at first sight, or should I walk by again?',
  'Are you a parking ticket? Because you’ve got fine written all over you.',
  'Is your name Google? Because you have everything I’ve been searching for.',
];

const pickupline: Command = {
  name: 'pickupline',
  aliases: ['pickup', 'rizz'],
  category: 'fun',
  description: 'Get a cheesy pickup line.',
  usage: 'pickupline',
  async run({ sock, msg }) {
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    await reply(sock, msg, `😏 ${line}`);
  },
};

export default pickupline;
