import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** adviceslip.com — free, no key. */
const advice: Command = {
  name: 'advice',
  category: 'fun',
  description: 'Get a random piece of advice.',
  usage: 'advice',
  async run({ sock, msg }) {
    try {
      const d = await fetchJson<any>(
        `https://api.adviceslip.com/advice?t=${Date.now()}`,
      );
      await reply(sock, msg, `💡 ${d.slip.advice}`);
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch advice right now.');
    }
  },
};

export default advice;
