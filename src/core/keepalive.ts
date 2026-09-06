import http from 'http';
import { logger } from '../utils/logger';
import { env } from '../config';
import { META } from '../config';

/**
 * Minimal HTTP keep-alive server.
 *
 * Most free hosts (Render, Koyeb, Railway web services) expect the app to bind
 * to `$PORT` and answer health checks, or they mark the deploy as failed and
 * kill it. A WhatsApp bot has no web surface, so we expose a tiny status
 * endpoint purely to satisfy the platform and let uptime pingers keep the
 * instance awake.
 *
 * No-op when PORT is not set (e.g. local runs, Heroku worker dynos).
 */
export function startKeepAlive(): void {
  const port = process.env.PORT;
  if (!port) return;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'alive',
        bot: env.botName,
        version: META.version,
        uptime: Math.floor(process.uptime()),
      }),
    );
  });

  server.listen(Number(port), '0.0.0.0', () => {
    logger.info(`🌐 Keep-alive server listening on :${port}`);
  });

  server.on('error', (err) => {
    logger.warn(`Keep-alive server error: ${err.message}`);
  });
}
