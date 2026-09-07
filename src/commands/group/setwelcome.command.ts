import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { groupRepo } from '../../database/repositories/group.repo';

/**
 * Set a custom welcome message for the group.
 *   .setwelcome Welcome @user to @group! You are member #@count
 *   .setwelcome reset   → back to default
 * Placeholders: @user @group @count @desc
 */
const setwelcome: Command = {
  name: 'setwelcome',
  aliases: ['welcomemsg', 'setwelcomemsg'],
  category: 'group',
  description: 'Set a custom welcome message (placeholders: @user @group @count @desc).',
  usage: 'setwelcome <message> | setwelcome reset',
  groupOnly: true,
  adminOnly: true,
  async run({ sock, msg, text }) {
    const value = (text || '').trim();
    if (!value) {
      const current = groupRepo.get(msg.chat)?.welcomeText;
      await reply(
        sock,
        msg,
        `ℹ️ *Custom welcome message*\n\n` +
          (current ? `Current:\n${current}\n\n` : 'Using the default message.\n\n') +
          'Set one with:\n`.setwelcome Welcome @user to @group!`\n\n' +
          'Placeholders: @user @group @count @desc\n' +
          'Tip: enable it with `.welcome on`.',
      );
      return;
    }
    if (['reset', 'default', 'clear'].includes(value.toLowerCase())) {
      groupRepo.setText(msg.chat, 'welcomeText', '');
      await reply(sock, msg, '✅ Welcome message reset to default.');
      return;
    }
    groupRepo.setText(msg.chat, 'welcomeText', value);
    await reply(
      sock,
      msg,
      '✅ Custom welcome message saved.\nMake sure welcome is on: `.welcome on`',
    );
  },
};

export default setwelcome;
