import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

const FALLBACK = [
  'Drink a glass of water — you probably need it.',
  "Don't compare your chapter 1 to someone else's chapter 20.",
  'Sleep on big decisions before making them.',
  'A short walk clears the mind better than another scroll.',
  'Say the kind thing out loud; people rarely regret it.',
  'Done is better than perfect. Ship it.',
  'Save a little before you spend a lot.',
  "If it takes less than two minutes, do it now.",
  'Reply to that message you have been avoiding.',
  'Be the person your younger self needed.',
];

/** adviceslip.com — free, no key. Falls back to a built-in list. */
const advice: Command = {
  name: 'advice',
  category: 'fun',
  description: 'Get a random piece of advice.',
  usage: 'advice',
  async run({ sock, msg }) {
    let line = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    try {
      const d = await fetchJson<any>(
        `https://api.adviceslip.com/advice?t=${Date.now()}`,
      );
      if (d?.slip?.advice) line = d.slip.advice;
    } catch {
      /* keep the built-in fallback */
    }
    await reply(sock, msg, `💡 ${line}`);
  },
};

export default advice;
