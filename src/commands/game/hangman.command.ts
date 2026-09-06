import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { games } from '../_shared/gamestate';
import type { HangmanSession } from '../_shared/gamestate';

const WORDS = [
  'javascript', 'whatsapp', 'nigeria', 'computer', 'developer',
  'baileys', 'typescript', 'keyboard', 'internet', 'algorithm',
  'function', 'variable', 'database', 'network', 'python',
];

const STAGES = [
  '', '❌', '❌❌', '❌❌❌', '❌❌❌❌', '❌❌❌❌❌', '💀 GAME OVER',
];

function render(s: HangmanSession): string {
  const masked = [...s.word]
    .map((c) => (s.guessed.has(c) ? c : '_'))
    .join(' ');
  return [
    `🎯 *Hangman*`,
    '',
    `Word: ${masked}`,
    `Wrong: ${s.wrong}/${s.maxWrong} ${STAGES[s.wrong] ?? ''}`,
    `Guessed: ${[...s.guessed].join(', ') || '—'}`,
    '',
    `Guess with *.guess <letter>* or *.guess <word>*`,
  ].join('\n');
}

const hangman: Command = {
  name: 'hangman',
  category: 'game',
  description: 'Start a game of hangman (guess with .guess).',
  usage: 'hangman',
  async run({ sock, msg }) {
    if (games.getHangman(msg.chat)) {
      await reply(sock, msg, '⚠️ A hangman game is already running here. Use *.guess* or *.delhangman*.');
      return;
    }
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const session: HangmanSession = {
      word,
      guessed: new Set(),
      wrong: 0,
      maxWrong: 6,
    };
    games.setHangman(msg.chat, session);
    await reply(sock, msg, render(session));
  },
};

export { render as renderHangman };
export default hangman;
