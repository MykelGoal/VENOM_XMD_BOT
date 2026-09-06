import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** WMO weather codes → human description + emoji. */
const WMO: Record<number, [string, string]> = {
  0: ['Clear sky', '☀️'],
  1: ['Mainly clear', '🌤️'],
  2: ['Partly cloudy', '⛅'],
  3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'],
  48: ['Rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'],
  53: ['Drizzle', '🌦️'],
  55: ['Heavy drizzle', '🌧️'],
  61: ['Light rain', '🌦️'],
  63: ['Rain', '🌧️'],
  65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '🌨️'],
  73: ['Snow', '🌨️'],
  75: ['Heavy snow', '❄️'],
  80: ['Rain showers', '🌦️'],
  81: ['Rain showers', '🌧️'],
  82: ['Violent showers', '⛈️'],
  95: ['Thunderstorm', '⛈️'],
  96: ['Thunderstorm w/ hail', '⛈️'],
  99: ['Severe thunderstorm', '🌩️'],
};

/** Small retry wrapper — free APIs sometimes blip on cold hosts. */
async function tryFetch<T>(url: string, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchJson<T>(url);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

/** Uses the free, no-key Open-Meteo geocoding + forecast APIs. */
const weather: Command = {
  name: 'weather',
  aliases: ['temp', 'wtr'],
  category: 'tools',
  description: 'Get current weather for a city (no API key needed).',
  usage: 'weather <city>',
  async run({ sock, msg, text }) {
    const query = (text || '').trim();
    if (!query) {
      await reply(sock, msg, 'ℹ️ Usage: *weather <city>*\nExample: *weather Lagos*');
      return;
    }
    try {
      const geo = await tryFetch<any>(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query,
        )}&count=1&language=en&format=json`,
      );
      const place = geo?.results?.[0];
      if (!place) {
        await reply(
          sock,
          msg,
          `❌ Couldn't find "${query}". Check the spelling and try again.`,
        );
        return;
      }

      const wx = await tryFetch<any>(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}` +
          `&longitude=${place.longitude}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code` +
          `&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
      );
      const c = wx?.current;
      if (!c) {
        await reply(sock, msg, '⚠️ Weather data was empty. Try again shortly.');
        return;
      }

      const [desc, emoji] = WMO[c.weather_code] ?? ['—', '🌡️'];
      const hi = wx?.daily?.temperature_2m_max?.[0];
      const lo = wx?.daily?.temperature_2m_min?.[0];
      const loc = [place.name, place.admin1, place.country]
        .filter(Boolean)
        .join(', ');

      const out = [
        `${emoji} *Weather — ${loc}*`,
        '',
        `${emoji} ${desc}`,
        `🌡️ Temp: *${c.temperature_2m}°C* (feels ${c.apparent_temperature}°C)`,
        hi != null && lo != null ? `📈 High ${hi}°C · 📉 Low ${lo}°C` : '',
        `💧 Humidity: ${c.relative_humidity_2m}%`,
        `💨 Wind: ${c.wind_speed_10m} km/h`,
      ]
        .filter(Boolean)
        .join('\n');

      await reply(sock, msg, out);
    } catch {
      await reply(
        sock,
        msg,
        '⚠️ Could not fetch weather right now. The service may be busy — please try again in a moment.',
      );
    }
  },
};

export default weather;
