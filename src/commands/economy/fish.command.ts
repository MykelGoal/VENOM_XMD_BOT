import { makeGather } from '../_shared/gather';

export default makeGather({
  name: 'fish',
  aliases: ['fishing'],
  field: 'lastFish',
  cooldownMs: 20 * 60 * 1000,
  requiredItem: 'fishingrod',
  requiredItemName: 'Fishing Rod 🎣',
  min: 150,
  max: 600,
  successEmoji: '🎣',
  wins: [
    'You caught a big tuna and sold it for {amt}!',
    'You reeled in a treasure chest worth {amt}!',
    'A rare salmon earned you {amt}!',
  ],
  fail: '🎣 The fish weren\'t biting today. Nothing caught.',
});
