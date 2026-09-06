import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { noteRepo } from '../../database/repositories/note.repo';

const addnote: Command = {
  name: 'addnote',
  aliases: ['savenote', 'note'],
  category: 'tools',
  description: 'Save a personal note.',
  usage: 'addnote <name> <content>',
  async run({ sock, msg, args }) {
    const name = args[0];
    const content = args.slice(1).join(' ') || msg.quoted?.body;
    if (!name || !content) {
      await reply(sock, msg, 'ℹ️ Usage: *addnote <name> <content>* (or reply to a message)');
      return;
    }
    noteRepo.set(msg.senderNumber, name, content);
    await reply(sock, msg, `📝 Note *${name}* saved.`);
  },
};

export default addnote;
