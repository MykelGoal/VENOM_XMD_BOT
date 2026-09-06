import sharp from 'sharp';

/**
 * Self-contained stylized text-image generator using SVG + sharp.
 * No external API — always works. Each style returns a PNG buffer.
 */

export type TextStyle =
  | 'neonlight'
  | 'hacker'
  | 'glitch'
  | 'galaxy'
  | 'fire'
  | 'gaming'
  | 'metallic'
  | 'rainbow';

const W = 1000;
const H = 420;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Fit font size roughly to the text length. */
function fontSize(text: string): number {
  const len = Math.max(text.length, 1);
  return Math.max(48, Math.min(180, Math.floor(1600 / len)));
}

function svgFor(style: TextStyle, raw: string): string {
  const text = escapeXml(raw.slice(0, 30));
  const fs = fontSize(raw.slice(0, 30));
  const cx = W / 2;
  const cy = H / 2;
  const base = (fill: string, extra = '') =>
    `<text x="${cx}" y="${cy}" font-family="Arial Black, Arial, sans-serif" font-size="${fs}" font-weight="bold" text-anchor="middle" dominant-baseline="middle" ${extra} fill="${fill}">${text}</text>`;

  switch (style) {
    case 'neonlight':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <rect width="100%" height="100%" fill="#0a0a12"/>
        <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <g filter="url(#glow)">${base('#00eaff', 'stroke="#00eaff" stroke-width="2"')}</g>
      </svg>`;
    case 'hacker':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <rect width="100%" height="100%" fill="#000000"/>
        <defs><filter id="g"><feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <g filter="url(#g)"><text x="${cx}" y="${cy}" font-family="Courier New, monospace" font-size="${fs}" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#00ff41">${text}</text></g>
      </svg>`;
    case 'glitch':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <rect width="100%" height="100%" fill="#111"/>
        ${base('#ff003c', `transform="translate(-6,-3)" opacity="0.85"`)}
        ${base('#00fff9', `transform="translate(6,3)" opacity="0.85"`)}
        ${base('#ffffff')}
      </svg>`;
    case 'galaxy':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#3a1c71"/><stop offset="50%" stop-color="#d76d77"/><stop offset="100%" stop-color="#141e30"/>
          </radialGradient>
          <linearGradient id="txt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#a18cd1"/><stop offset="100%" stop-color="#fbc2eb"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        ${base('url(#txt)', 'stroke="#ffffff" stroke-width="1"')}
      </svg>`;
    case 'fire':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <rect width="100%" height="100%" fill="#0d0000"/>
        <defs>
          <linearGradient id="fire" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#ff0000"/><stop offset="50%" stop-color="#ff7b00"/><stop offset="100%" stop-color="#ffeb00"/>
          </linearGradient>
          <filter id="fg"><feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <g filter="url(#fg)">${base('url(#fire)')}</g>
      </svg>`;
    case 'gaming':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <rect width="100%" height="100%" fill="#12002e"/>
        <defs>
          <linearGradient id="gm" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#f72585"/><stop offset="100%" stop-color="#7209b7"/>
          </linearGradient>
          <filter id="gg"><feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <g filter="url(#gg)">${base('url(#gm)', 'stroke="#ffffff" stroke-width="2"')}</g>
      </svg>`;
    case 'metallic':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#eeeeee"/><stop offset="45%" stop-color="#999999"/>
            <stop offset="55%" stop-color="#555555"/><stop offset="100%" stop-color="#cccccc"/>
          </linearGradient>
        </defs>
        ${base('url(#metal)', 'stroke="#000000" stroke-width="1"')}
      </svg>`;
    case 'rainbow':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <defs>
          <linearGradient id="rb" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ff0000"/><stop offset="20%" stop-color="#ff9900"/>
            <stop offset="40%" stop-color="#ffee00"/><stop offset="60%" stop-color="#33ff00"/>
            <stop offset="80%" stop-color="#0099ff"/><stop offset="100%" stop-color="#cc00ff"/>
          </linearGradient>
        </defs>
        ${base('url(#rb)', 'stroke="#000000" stroke-width="1"')}
      </svg>`;
  }
}

export async function makeTextImage(
  style: TextStyle,
  text: string,
): Promise<Buffer> {
  const svg = svgFor(style, text);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
