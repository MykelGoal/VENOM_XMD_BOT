import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { games } from '../_shared/gamestate';
import { renderHangman } from './hangman.command';

/**
 * Context-aware guess:
 *  - If a hangman game is active in this chat, treats the arg as a
 *    letter/word guess for it.
 *  - Otherwise plays a quick 1-10 number guess.
 */
const guess: Command = {
  name: 'guess',
  category: 'game',
  description: 'Guess a letter/word (hangman) or a number 1-10.',
  usage: 'guess <letter|word|number>',
  async run({ sock, msg, args }) {
    const input = (args[0] ?? '').toLowerCase().trim();

    const session = games.getHangman(msg.chat);
    if (session) {
      if (!input || !/^[a-z]+$/.test(input)) {
        await reply(sock, msg, 'ℹ️ Guess a letter or the whole word.');
        return;
      }
      // Full-word guess.
      if (input.length > 1) {
        if (input === session.word) {
          games.endHangman(msg.chat);
          await reply(sock, msg, `🎉 Correct! The word was *${session.word}*. You win!`);
        } else {
          session.wrong += 1;
          if (session.wrong >= session.maxWrong) {
            games.endHangman(msg.chat);
            await reply(sock, msg, `💀 Wrong! Game over. The word was *${session.word}*.`);
          } else {
            games.setHangman(msg.chat, session);
            await reply(sock, msg, `❌ "${input}" is not the word.\n\n${renderHangman(session)}`);
          }
        }
        return;
      }
      // Single-letter guess.
      if (session.guessed.has(input)) {
        await reply(sock, msg, `⚠️ "${input}" was already guessed.`);
        return;
      }
      session.guessed.add(input);
      if (!session.word.includes(input)) session.wrong += 1;

      const won = [...session.word].every((c) => session.guessed.has(c));
      if (won) {
        games.endHangman(msg.chat);
        await reply(sock, msg, `🎉 You solved it! The word was *${session.word}*.`);
      } else if (session.wrong >= session.maxWrong) {
        games.endHangman(msg.chat);
        await reply(sock, msg, `💀 Game over! The word was *${session.word}*.`);
      } else {
        games.setHangman(msg.chat, session);
        await reply(sock, msg, renderHangman(session));
      }
      return;
    }

    // Fallback: number guessing game.
    const g = parseInt(input, 10);
    if (isNaN(g) || g < 1 || g > 10) {
      await reply(sock, msg, 'ℹ️ No hangman running. Usage: *guess <1-10>* (or start *.hangman*).');
      return;
    }
    const n = Math.floor(Math.random() * 10) + 1;
    await reply(sock, msg, g === n ? `🎉 Correct! It was *${n}*.` : `❌ Nope, it was *${n}*.`);
  },
};

export default guess;
