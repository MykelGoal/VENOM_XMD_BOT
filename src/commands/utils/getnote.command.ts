import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { noteRepo } from '../../database/repositories/note.repo';

const getnote: Command = {
  name: 'getnote',
  aliases: ['readnote'],
  category: 'tools',
  description: 'Retrieve a saved note.',
  usage: 'getnote <name>',
  async run({ sock, msg, args }) {
    const name = args[0];
    if (!name) {
      await reply(sock, msg, 'ℹ️ Usage: *getnote <name>*');
      return;
    }
    const note = noteRepo.get(msg.senderNumber, name);
    if (!note) {
      await reply(sock, msg, `❌ No note named *${name}*.`);
      return;
    }
    await reply(sock, msg, `📝 *${note.name}*\n\n${note.content}`);
  },
};

export default getnote;
