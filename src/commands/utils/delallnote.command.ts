import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { noteRepo } from '../../database/repositories/note.repo';

const delallnote: Command = {
  name: 'delallnote',
  aliases: ['clearnotes'],
  category: 'tools',
  description: 'Delete ALL your saved notes.',
  usage: 'delallnote',
  async run({ sock, msg }) {
    const n = noteRepo.clearAll(msg.senderNumber);
    await reply(sock, msg, `🗑️ Deleted ${n} note(s).`);
  },
};

export default delallnote;
