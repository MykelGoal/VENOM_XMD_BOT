import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const rps: Command = {
  name: 'rps',
  aliases: ['rockpaperscissors'],
  category: 'game',
  description: 'Play rock-paper-scissors against the bot.',
  usage: 'rps <rock|paper|scissors>',
  async run({ sock, msg, args }) {
    const choices = ['rock', 'paper', 'scissors'];
    const user = args[0]?.toLowerCase();
    if (!choices.includes(user)) {
      await reply(sock, msg, 'ℹ️ Usage: *rps rock | paper | scissors*');
      return;
    }
    const bot = choices[Math.floor(Math.random() * 3)];
    const emoji: Record<string, string> = {
      rock: '🪨', paper: '📄', scissors: '✂️',
    };
    let result: string;
    if (user === bot) result = "It's a tie!";
    else if (
      (user === 'rock' && bot === 'scissors') ||
      (user === 'paper' && bot === 'rock') ||
      (user === 'scissors' && bot === 'paper')
    )
      result = 'You win! 🎉';
    else result = 'You lose! 😜';

    await reply(
      sock,
      msg,
      `You: ${emoji[user]}\nMe: ${emoji[bot]}\n\n*${result}*`,
    );
  },
};

export default rps;
