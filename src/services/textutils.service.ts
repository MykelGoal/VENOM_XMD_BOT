/**
 * Text & crypto utilities — pure, offline, dependency-light helpers.
 * Everything here is deterministic and unit-tested; no network calls.
 */
import crypto from 'crypto';

/** ────────────────────────── Encoding ────────────────────────── */

export function toBase64(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64');
}

export function fromBase64(input: string): string {
  return Buffer.from(input, 'base64').toString('utf8');
}

export function toBinary(input: string): string {
  return input
    .split('')
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(' ');
}

export function fromBinary(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .map((b) => String.fromCharCode(parseInt(b, 2)))
    .join('');
}

export function toHex(input: string): string {
  return Buffer.from(input, 'utf8').toString('hex');
}

export function fromHex(input: string): string {
  return Buffer.from(input.replace(/\s+/g, ''), 'hex').toString('utf8');
}

/** ────────────────────────── Hashing ────────────────────────── */

export function hash(algo: string, input: string): string {
  return crypto.createHash(algo).update(input).digest('hex');
}

/** ────────────────────────── Morse code ────────────────────────── */

const MORSE: Record<string, string> = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.',
  h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.',
  o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-',
  v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.', ' ': '/',
};
const MORSE_REV: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([k, v]) => [v, k]),
);

export function toMorse(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((c) => MORSE[c] ?? '')
    .filter(Boolean)
    .join(' ');
}

export function fromMorse(input: string): string {
  return input
    .trim()
    .split(' ')
    .map((code) => (code === '/' ? ' ' : MORSE_REV[code] ?? ''))
    .join('');
}

/** ────────────────────────── Fun text transforms ────────────────────────── */

export function mockCase(input: string): string {
  let upper = false;
  return input
    .split('')
    .map((c) => {
      if (!/[a-z]/i.test(c)) return c;
      upper = !upper;
      return upper ? c.toUpperCase() : c.toLowerCase();
    })
    .join('');
}

export function reverseText(input: string): string {
  return input.split('').reverse().join('');
}

/** Full-width "vaporwave / aesthetic" text. */
export function vaporwave(input: string): string {
  return input
    .split('')
    .map((c) => {
      const code = c.charCodeAt(0);
      if (code >= 33 && code <= 126) return String.fromCharCode(code + 0xfee0);
      if (c === ' ') return '\u3000';
      return c;
    })
    .join('');
}

/** ────────────────────────── Generators ────────────────────────── */

export function uuid(): string {
  return crypto.randomUUID();
}

export function password(length = 16, symbols = true): string {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const chars = symbols ? base + '!@#$%^&*()-_=+[]{};:,.?' : base;
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}
