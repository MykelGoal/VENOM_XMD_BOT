import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { downloadMedia, compressImage } from '../../services/media.service';
import { isBotAdmin } from '../../middleware/permission';

/** Set the group's profile picture from a replied/attached image. */
const setppgc: Command = {
  name: 'setppgc',
  aliases: ['setgpp', 'setgroupicon', 'gpp'],
  category: 'group',
  description: "Change the group's profile picture (reply to an image).",
  usage: 'setppgc (reply to an image)',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg }) {
    if (!(await isBotAdmin(sock, msg.chat))) {
      await reply(sock, msg, '🚫 I need to be an admin to change the group icon.');
      return;
    }
    const target = msg.quoted ?? msg;
    if (target.type !== 'imageMessage') {
      await reply(sock, msg, 'ℹ️ Reply to an image with *setppgc*.');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const buf = await downloadMedia(target.raw);
      const img = await compressImage(buf);
      await sock.updateProfilePicture(msg.chat, img);
      await react(sock, msg, '✅');
      await reply(sock, msg, '✅ Group icon updated.');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not update the group icon.');
    }
  },
};

export default setppgc;
