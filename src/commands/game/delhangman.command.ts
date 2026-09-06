import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { games } from '../_shared/gamestate';

const delhangman: Command = {
  name: 'delhangman',
  aliases: ['stophangman', 'endhangman'],
  category: 'game',
  description: 'End the current hangman game.',
  usage: 'delhangman',
  async run({ sock, msg }) {
    const s = games.getHangman(msg.chat);
    if (!s) {
      await reply(sock, msg, 'ℹ️ No hangman game running here.');
      return;
    }
    games.endHangman(msg.chat);
    await reply(sock, msg, `🛑 Hangman ended. The word was *${s.word}*.`);
  },
};

export default delhangman;
