import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const jid: Command = {
  name: 'jid',
  aliases: ['chatid'],
  category: 'tools',
  description: 'Show the JID (id) of this chat and the sender.',
  usage: 'jid',
  async run({ sock, msg }) {
    await reply(
      sock,
      msg,
      `🆔 *Chat:* ${msg.chat}\n👤 *Sender:* ${msg.sender}\n📌 *Type:* ${msg.isGroup ? 'group' : 'private'}`,
    );
  },
};

export default jid;
