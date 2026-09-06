import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** Uses the free, no-key Open-Meteo geocoding + forecast APIs. */
const weather: Command = {
  name: 'weather',
  aliases: ['temp'],
  category: 'tools',
  description: 'Get current weather for a city (no API key needed).',
  usage: 'weather <city>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *weather <city>*');
      return;
    }
    try {
      const geo = await fetchJson<any>(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=1`,
      );
      const place = geo?.results?.[0];
      if (!place) {
        await reply(sock, msg, `❌ Couldn't find "${text}".`);
        return;
      }
      const wx = await fetchJson<any>(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`,
      );
      const c = wx.current;
      const out = [
        `🌦️ *${place.name}, ${place.country}*`,
        '',
        `🌡️ Temp: ${c.temperature_2m}°C`,
        `💧 Humidity: ${c.relative_humidity_2m}%`,
        `💨 Wind: ${c.wind_speed_10m} km/h`,
      ].join('\n');
      await reply(sock, msg, out);
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch weather right now.');
    }
  },
};

export default weather;
