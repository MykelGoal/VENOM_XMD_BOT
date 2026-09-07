import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupRepo } from '../../database/repositories/group.repo';

/**
 * Set a custom goodbye message for the group.
 * Placeholders: @user @group @count
 */
const setgoodbye: Command = {
  name: 'setgoodbye',
  aliases: ['goodbyemsg', 'setgoodbyemsg'],
  category: 'group',
  description: 'Set a custom goodbye message (placeholders: @user @group @count).',
  usage: 'setgoodbye <message> | setgoodbye reset',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, text }) {
    const value = (text || '').trim();
    if (!value) {
      const current = groupRepo.get(msg.chat)?.goodbyeText;
      await reply(
        sock,
        msg,
        `ℹ️ *Custom goodbye message*\n\n` +
          (current ? `Current:\n${current}\n\n` : 'Using the default message.\n\n') +
          'Set one with:\n`.setgoodbye @user just left @group`\n\n' +
          'Placeholders: @user @group @count\n' +
          'Tip: enable it with `.goodbye on`.',
      );
      return;
    }
    if (['reset', 'default', 'clear'].includes(value.toLowerCase())) {
      groupRepo.setText(msg.chat, 'goodbyeText', '');
      await reply(sock, msg, '✅ Goodbye message reset to default.');
      return;
    }
    groupRepo.setText(msg.chat, 'goodbyeText', value);
    await reply(
      sock,
      msg,
      '✅ Custom goodbye message saved.\nMake sure goodbye is on: `.goodbye on`',
    );
  },
};

export default setgoodbye;
