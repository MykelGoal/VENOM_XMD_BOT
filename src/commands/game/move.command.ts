import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { games } from '../_shared/gamestate';
import { renderBoard } from './ttt.command';

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winner(b: (string | null)[]): string | null {
  for (const [a, c, d] of WINS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
}

const move: Command = {
  name: 'move',
  category: 'game',
  description: 'Make a tic-tac-toe move (1-9).',
  usage: 'move <1-9>',
  async run({ sock, msg, args }) {
    const s = games.getTtt(msg.chat);
    if (!s) {
      await reply(sock, msg, 'ℹ️ No tic-tac-toe game running. Start one with *.ttt*.');
      return;
    }
    const pos = parseInt(args[0], 10) - 1;
    if (isNaN(pos) || pos < 0 || pos > 8) {
      await reply(sock, msg, 'ℹ️ Usage: *move <1-9>*');
      return;
    }
    if (s.board[pos]) {
      await reply(sock, msg, '⚠️ That cell is taken.');
      return;
    }

    // Second player joins as O on their first move.
    if (!s.playerO && msg.senderNumber !== s.playerX) {
      s.playerO = msg.senderNumber;
    }

    const isX = msg.senderNumber === s.playerX;
    const isO = msg.senderNumber === s.playerO;
    if (!isX && !isO) {
      await reply(sock, msg, "⚠️ You're not part of this game.");
      return;
    }
    const mark = isX ? 'X' : 'O';
    if (mark !== s.turn) {
      await reply(sock, msg, `⏳ It's ${s.turn === 'X' ? '❌' : '⭕'}'s turn.`);
      return;
    }

    s.board[pos] = mark;
    const win = winner(s.board);
    if (win) {
      games.endTtt(msg.chat);
      await reply(sock, msg, `${renderBoard(s)}\n\n🏆 ${win === 'X' ? '❌' : '⭕'} wins!`);
      return;
    }
    if (s.board.every((c) => c)) {
      games.endTtt(msg.chat);
      await reply(sock, msg, `${renderBoard(s)}\n\n🤝 It's a draw!`);
      return;
    }
    s.turn = s.turn === 'X' ? 'O' : 'X';
    games.setTtt(msg.chat, s);
    await reply(sock, msg, `${renderBoard(s)}\n\n${s.turn === 'X' ? '❌' : '⭕'}'s turn. *.move <1-9>*`);
  },
};

export default move;
