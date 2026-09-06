import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { noteRepo } from '../../database/repositories/note.repo';

const delnote: Command = {
  name: 'delnote',
  aliases: ['deletenote', 'rmnote'],
  category: 'tools',
  description: 'Delete a saved note.',
  usage: 'delnote <name>',
  async run({ sock, msg, args }) {
    const name = args[0];
    if (!name) {
      await reply(sock, msg, 'ℹ️ Usage: *delnote <name>*');
      return;
    }
    const ok = noteRepo.delete(msg.senderNumber, name);
    await reply(sock, msg, ok ? `🗑️ Note *${name}* deleted.` : `❌ No note named *${name}*.`);
  },
};

export default delnote;
