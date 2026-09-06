import { makeGather } from '../_shared/gather';

export default makeGather({
  name: 'hunt',
  aliases: ['hunting'],
  field: 'lastHunt',
  cooldownMs: 25 * 60 * 1000,
  requiredItem: 'rifle',
  requiredItemName: 'Hunting Rifle 🔫',
  min: 200,
  max: 750,
  successEmoji: '🏹',
  wins: [
    'You hunted a deer and sold the meat for {amt}!',
    'You bagged a wild boar worth {amt}!',
    'You caught a rare fox pelt worth {amt}!',
  ],
  fail: '🏹 The forest was empty. You came back with nothing.',
});
