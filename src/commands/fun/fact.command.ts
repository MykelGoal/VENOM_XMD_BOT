import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

const FALLBACK = [
  'Honey never spoils — edible honey has been found in 3,000-year-old tombs.',
  'Octopuses have three hearts and blue blood.',
  'Bananas are berries, but strawberries are not.',
  'A day on Venus is longer than its year.',
  'Sharks existed before trees did.',
  'The Eiffel Tower can grow taller by up to 15 cm in summer heat.',
  'Wombat poop is cube-shaped.',
  'There are more possible chess games than atoms in the observable universe.',
  'Hot water can freeze faster than cold water (the Mpemba effect).',
  'A group of flamingos is called a "flamboyance".',
];

/** uselessfacts — free, no key. Falls back to a built-in list. */
const fact: Command = {
  name: 'fact',
  aliases: ['randomfact'],
  category: 'fun',
  description: 'Get a random interesting fact.',
  usage: 'fact',
  async run({ sock, msg }) {
    let line = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    try {
      const d = await fetchJson<any>(
        'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en',
      );
      if (d?.text) line = d.text;
    } catch {
      /* keep the built-in fallback */
    }
    await reply(sock, msg, `🧠 ${line}`);
  },
};

export default fact;
