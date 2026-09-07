import { makeGroupToggle } from '../_shared/grouptoggle';

/**
 * When ON, any demotion NOT performed by the bot is automatically reverted.
 * Protects admins from being stripped by a rogue admin. Bot must be admin.
 */
export default makeGroupToggle({
  name: 'antidemote',
  flag: 'antidemote',
  label: 'Anti-demote protection',
  description: 'Auto-revert unauthorized admin demotions (bot must be admin).',
});
