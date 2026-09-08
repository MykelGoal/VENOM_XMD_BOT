import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';

/**
 * .ssweb <url> — take a screenshot of any website and send it as an image.
 * Uses keyless screenshot services (thum.io primary, s-shot.ru fallback).
 * Add "full" for a full-page capture: .ssweb full <url>
 */
const ssweb: Command = {
  name: 'ssweb',
  aliases: ['ss', 'screenshot', 'webshot', 'sshot'],
  category: 'tools',
  description: 'Screenshot any website and send it as an image.',
  usage: 'ssweb <url>   |   ssweb full <url>',
  async run({ sock, msg, args }) {
    let full = false;
    const parts = [...args];
    if ((parts[0] ?? '').toLowerCase() === 'full') {
      full = true;
      parts.shift();
    }
    let url = (parts.join(' ') || '').trim();

    if (!url) {
      await reply(
        sock,
        msg,
        [
          '📸 *Website Screenshot*',
          '',
          'Usage: `.ssweb <url>`',
          'Full page: `.ssweb full <url>`',
          '',
          '_Example:_ `.ssweb github.com`',
        ].join('\n'),
      );
      return;
    }

    // Normalize URL.
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
      // Validate.
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      await reply(sock, msg, '❌ That doesn’t look like a valid website URL.');
      return;
    }

    await react(sock, msg, '📸');

    const buf = await capture(url, full);
    if (!buf) {
      await react(sock, msg, '❌');
      await reply(
        sock,
        msg,
        '❌ Couldn’t capture that site. It may be down, blocking bots, or too slow. Try another URL.',
      );
      return;
    }

    try {
      await sock.sendMessage(
        msg.chat,
        {
          image: buf,
          caption: `📸 ${url}${full ? ' (full page)' : ''}\n🕷️ VENOM-XMD`,
        },
        { quoted: msg.raw },
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Failed to send the screenshot. Try again.');
    }
  },
};

/** Fetch a screenshot as a Buffer from keyless services, with fallback. */
async function capture(url: string, full: boolean): Promise<Buffer | null> {
  const targets: string[] = [];

  // thum.io — reliable, keyless. crop=1500 gives a tall-ish capture.
  const thumOpts = full ? 'width/1200/crop/3000/noanimate' : 'width/1200/crop/1200/noanimate';
  targets.push(`https://image.thum.io/get/${thumOpts}/${url}`);

  // s-shot.ru fallback (full-page friendly).
  const height = full ? '0' : '900';
  targets.push(`https://mini.s-shot.ru/1200x${height}/PNG/1200/?${url}`);

  for (const t of targets) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(t, {
        headers: { 'User-Agent': 'Mozilla/5.0 (VENOM-XMD screenshot)' },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (!res.ok) continue;
      const type = res.headers.get('content-type') || '';
      if (!type.startsWith('image/')) continue;
      const arr = Buffer.from(await res.arrayBuffer());
      if (arr.length > 3000) return arr; // guard against tiny error images
    } catch {
      /* try next */
    }
  }
  return null;
}

export default ssweb;
