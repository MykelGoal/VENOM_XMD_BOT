import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { games } from '../_shared/gamestate';
import type { TttSession } from '../_shared/gamestate';

export function renderBoard(s: TttSession): string {
  const cells = s.board.map((c, i) =>
    c === 'X' ? '❌' : c === 'O' ? '⭕' : `${i + 1}️⃣`,
  );
  return [
    `${cells[0]}${cells[1]}${cells[2]}`,
    `${cells[3]}${cells[4]}${cells[5]}`,
    `${cells[6]}${cells[7]}${cells[8]}`,
  ].join('\n');
}

const ttt: Command = {
  name: 'ttt',
  aliases: ['tictactoe'],
  category: 'game',
  description: 'Start tic-tac-toe. A second player joins by making a move.',
  usage: 'ttt',
  async run({ sock, msg }) {
    if (games.getTtt(msg.chat)) {
      await reply(sock, msg, '⚠️ A game is already running. Use *.move <1-9>* or *.delttt*.');
      return;
    }
    const session: TttSession = {
      board: Array(9).fill(null),
      turn: 'X',
      playerX: msg.senderNumber,
      playerO: null,
    };
    games.setTtt(msg.chat, session);
    await reply(
      sock,
      msg,
      `🎮 *Tic-Tac-Toe started!*\nYou are ❌. Another player: send *.move <1-9>* to join as ⭕.\n\n${renderBoard(session)}\n\n❌'s turn. Use *.move <1-9>*`,
    );
  },
};

export default ttt;
