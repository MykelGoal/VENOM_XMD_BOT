/**
 * In-memory game session store, keyed by chat JID. Games are ephemeral
 * (lost on restart) which is fine for quick interactive games.
 */

export interface HangmanSession {
  word: string;
  guessed: Set<string>;
  wrong: number;
  maxWrong: number;
}

export interface TttSession {
  board: (string | null)[]; // 9 cells
  turn: 'X' | 'O';
  playerX: string; // number
  playerO: string | null; // number or null until someone joins
}

class GameStore {
  private hangman = new Map<string, HangmanSession>();
  private ttt = new Map<string, TttSession>();

  // Hangman
  getHangman(chat: string) {
    return this.hangman.get(chat);
  }
  setHangman(chat: string, s: HangmanSession) {
    this.hangman.set(chat, s);
  }
  endHangman(chat: string) {
    this.hangman.delete(chat);
  }

  // Tic-tac-toe
  getTtt(chat: string) {
    return this.ttt.get(chat);
  }
  setTtt(chat: string, s: TttSession) {
    this.ttt.set(chat, s);
  }
  endTtt(chat: string) {
    this.ttt.delete(chat);
  }
}

export const games = new GameStore();
