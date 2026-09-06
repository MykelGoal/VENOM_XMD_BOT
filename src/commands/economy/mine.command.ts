import { makeGather } from '../_shared/gather';

export default makeGather({
  name: 'mine',
  aliases: ['mining'],
  field: 'lastMine',
  cooldownMs: 25 * 60 * 1000,
  requiredItem: 'pickaxe',
  requiredItemName: 'Pickaxe ⛏️',
  min: 200,
  max: 800,
  successEmoji: '⛏️',
  wins: [
    'You mined a chunk of gold worth {amt}!',
    'You struck a diamond vein and got {amt}!',
    'You found rare ore and sold it for {amt}!',
  ],
  fail: '⛏️ You only hit rock. Nothing valuable today.',
});
