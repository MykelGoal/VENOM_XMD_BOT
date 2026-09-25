import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const tourhelp: Command = {
  name: 'tourhelp',
  aliases: ['tournament', 'tour'],
  category: 'group',
  description: 'Show the quiet, redeploy-safe tournament workflow.',
  usage: 'tourhelp',
  async run({ sock, msg, prefix }) {
    await reply(
      sock,
      msg,
      [
        '🏆 *VENOM TOURNAMENT COMMANDS*',
        '',
        '*Owner — configure privately once:*',
        `${prefix}touraccount BANK | ACCOUNT_NUMBER | ACCOUNT_NAME`,
        '',
        '*Organizer — create in the group:*',
        `${prefix}tourcreate CODE | date/time`,
        '',
        '*Players — use privately:*',
        `${prefix}tourjoin CODE Nickname | FreeFireUID`,
        `${prefix}tourproof CODE  _(caption on receipt)_`,
        `${prefix}tourcheckin CODE`,
        `${prefix}tourstatus CODE`,
        '',
        '*Organizer/admin — use privately unless stated:*',
        `${prefix}tourapprove CODE UID`,
        `${prefix}tourreject CODE UID`,
        `${prefix}tourplayers CODE`,
        `${prefix}tourreminder CODE 18:00  _(daily Lagos time)_`,
        `${prefix}tourcheckin open CODE`,
        `${prefix}tourroom CODE 1 | roomID | password`,
        `${prefix}tourround CODE 1 | UID,kills,place; UID,kills,place`,
        `${prefix}tourstandings CODE  _(posts once to group)_`,
        `${prefix}tourfinish CODE  _(posts final winners)_`,
        '',
        '🔕 Quiet mode: one short hidden-tag launch, one compact 6 PM reminder for unapproved members, 10/20/30/40 milestones, one standings post per round and one final post. Registrations, receipts, approvals, check-ins and room credentials stay in DM.',
        '💾 Tournament creation requires MongoDB so a redeploy cannot erase registrations or scores.',
      ].join('\n'),
    );
  },
};

export default tourhelp;
