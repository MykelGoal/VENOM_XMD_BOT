import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** worldtimeapi.org — free, no key. */
const time: Command = {
  name: 'time',
  aliases: ['worldtime'],
  category: 'tools',
  description: 'Get the current time for a timezone (e.g. Africa/Lagos).',
  usage: 'time <Area/City>',
  async run({ sock, msg, text }) {
    const tz = text || 'Africa/Lagos';
    try {
      const d = await fetchJson<any>(
        `https://worldtimeapi.org/api/timezone/${tz}`,
      );
      const dt = new Date(d.datetime);
      await reply(
        sock,
        msg,
        `🕒 *${tz}*\n\n${dt.toLocaleString('en-GB', { timeZone: tz })}`,
      );
    } catch {
      await reply(
        sock,
        msg,
        `❌ Unknown timezone. Try like *time Europe/London*.`,
      );
    }
  },
};

export default time;
