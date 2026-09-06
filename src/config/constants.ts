import path from 'path';

/** Absolute paths used across the app. */
export const PATHS = {
  root: path.resolve(__dirname, '..', '..'),
  sessions: path.resolve(__dirname, '..', '..', 'sessions'),
  media: path.resolve(__dirname, '..', '..', 'media'),
  logs: path.resolve(__dirname, '..', '..', 'logs'),
  commands: path.resolve(__dirname, '..', 'commands'),
} as const;

/** Static bot metadata. */
export const META = {
  version: '1.0.0',
  author: 'VENOM-XMD',
  repo: 'https://github.com/your-username/venom-xmd',
} as const;
