import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

/** Safe arithmetic calculator (no eval). Supports + - * / % ( ) . */
const calc: Command = {
  name: 'calc',
  aliases: ['calculate', 'math'],
  category: 'tools',
  description: 'Evaluate a basic math expression.',
  usage: 'calc <expression>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *calc 2 + 2 * 5*');
      return;
    }
    // Only allow digits, operators, parentheses, spaces and dots.
    if (!/^[0-9+\-*/%.()\s]+$/.test(text)) {
      await reply(sock, msg, '❌ Only numbers and + - * / % ( ) are allowed.');
      return;
    }
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${text})`)();
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('bad');
      }
      await reply(sock, msg, `🧮 ${text} = *${result}*`);
    } catch {
      await reply(sock, msg, '❌ Invalid expression.');
    }
  },
};

export default calc;
