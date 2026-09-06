import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { noteRepo } from '../../database/repositories/note.repo';

const allnotes: Command = {
  name: 'allnotes',
  aliases: ['listnotes', 'notes'],
  category: 'tools',
  description: 'List all your saved notes.',
  usage: 'allnotes',
  async run({ sock, msg }) {
    const notes = noteRepo.list(msg.senderNumber);
    if (notes.length === 0) {
      await reply(sock, msg, '📭 You have no saved notes. Add one with *.addnote*.');
      return;
    }
    const list = notes.map((n, i) => `${i + 1}. *${n.name}*`).join('\n');
    await reply(sock, msg, `🗒️ *Your notes (${notes.length})*\n\n${list}\n\nRead one with *.getnote <name>*`);
  },
};

export default allnotes;
