import { makeGroupToggle } from '../_shared/grouptoggle';

/**
 * When ON, any promotion NOT performed by the bot is automatically reverted.
 * Protects against rogue admins mass-promoting. Bot must be admin.
 */
export default makeGroupToggle({
  name: 'antipromote',
  flag: 'antipromote',
  label: 'Anti-promote protection',
  description: 'Auto-revert unauthorized admin promotions (bot must be admin).',
});
