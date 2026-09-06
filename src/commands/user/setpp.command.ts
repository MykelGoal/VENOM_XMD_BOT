import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia } from '../../services/media.service';

const setpp: Command = {
  name: 'setpp',
  aliases: ['setprofilepic', 'setpfp'],
  category: 'user',
  description: "Set the bot account's profile picture (reply to an image).",
  usage: 'setpp (reply to an image)',
  ownerOnly: true,
  async run({ sock, msg }) {
    const target = msg.quoted ?? msg;
    if (target.type !== 'imageMessage') {
      await reply(sock, msg, 'ℹ️ Reply to an image with *setpp*.');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const buf = await downloadMedia(target.raw);
      await sock.updateProfilePicture(sock.user!.id, buf);
      await react(sock, msg, '✅');
      await reply(sock, msg, '🖼️ Profile picture updated.');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '⚠️ Could not update the profile picture.');
    }
  },
};

export default setpp;
