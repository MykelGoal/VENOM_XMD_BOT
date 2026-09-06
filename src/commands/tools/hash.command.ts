import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { hash } from '../../services/textutils.service';

const hashCmd: Command = {
  name: 'hash',
  aliases: ['md5', 'sha256', 'sha1', 'sha512'],
  category: 'tools',
  description: 'Hash text with md5 / sha1 / sha256 / sha512.',
  usage: 'hash <algo> <text>  (or use .md5 / .sha256 directly)',
  async run({ sock, msg, args, text, prefix }) {
    // If invoked via an alias (.md5, .sha256…), the alias is the algo.
    const invoked = (msg.body.slice(prefix.length).trim().split(/\s+/)[0] || '').toLowerCase();
    const known = ['md5', 'sha1', 'sha256', 'sha512'];
    let algo: string;
    let payload: string;
    if (known.includes(invoked)) {
      algo = invoked;
      payload = text || msg.quoted?.body || '';
    } else {
      algo = (args[0] || 'sha256').toLowerCase();
      payload = text.split(/\s+/).slice(1).join(' ') || msg.quoted?.body || '';
    }
    if (!known.includes(algo)) {
      await reply(sock, msg, `ℹ️ Supported: ${known.join(', ')}\nUsage: *hash sha256 <text>*`);
      return;
    }
    if (!payload) {
      await reply(sock, msg, 'ℹ️ Provide text to hash (or reply to a message).');
      return;
    }
    try {
      await reply(sock, msg, `🔐 *${algo.toUpperCase()}*\n\`\`\`${hash(algo, payload)}\`\`\``);
    } catch {
      await reply(sock, msg, '❌ Could not compute that hash.');
    }
  },
};

export default hashCmd;
