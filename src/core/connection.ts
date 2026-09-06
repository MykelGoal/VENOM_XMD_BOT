import { Boom } from '@hapi/boom';
import {
  DisconnectReason,
  type WASocket,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { env } from '../config';
import { logger } from '../utils/logger';
import { sleep } from '../utils/helpers';
import { createClient } from './client';
import { registerEventHandlers } from '../handlers/event.handler';
import { syncSessionToCloud } from './session';

let pairingRequested = false;

/**
 * Boots the socket and manages the full connection lifecycle:
 * QR rendering, pairing-code request, and automatic reconnection.
 */
export async function startConnection(): Promise<void> {
  const { sock, auth } = await createClient();

  // Persist credentials whenever they update, and keep the cloud copy fresh
  // so a redeploy (with only SESSION_ID) always restores a valid session.
  sock.ev.on('creds.update', async () => {
    await auth.saveCreds();
    void syncSessionToCloud();
  });

  // Wire all app-level event handlers (messages, groups, etc.).
  registerEventHandlers(sock);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // ── QR login ──────────────────────────────────────────────
    if (qr && (env.loginMethod === 'qr' || env.loginMethod === 'both')) {
      logger.info('Scan the QR code below to log in:');
      qrcode.generate(qr, { small: true });
    }

    // ── Pairing-code login ────────────────────────────────────
    if (
      qr &&
      !sock.authState.creds.registered &&
      env.loginMethod === 'pairing' &&
      !pairingRequested
    ) {
      pairingRequested = true;
      await requestPairingCode(sock);
    }

    // ── Connected ─────────────────────────────────────────────
    if (connection === 'open') {
      logger.info(`✅ ${env.botName} connected as ${sock.user?.id}`);
      await sendStartupMessage(sock);
    }

    // ── Closed / reconnect logic ──────────────────────────────
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        logger.error(
          '❌ Logged out. Delete the /sessions folder and log in again.',
        );
        return;
      }

      logger.warn(
        `Connection closed (code ${statusCode}). Reconnecting in 3s...`,
      );
      await sleep(3000);
      await startConnection();
    }
  });
}

/** Sends a startup message to the owner when enabled via settings. */
async function sendStartupMessage(sock: WASocket): Promise<void> {
  try {
    // Lazy import to avoid a circular dependency at module load.
    const { settingsRepo } = await import(
      '../database/repositories/settings.repo'
    );
    if (!settingsRepo.getBool('startupmsg')) return;
    const owner = env.ownerNumbers[0];
    if (!owner) return;
    await sock.sendMessage(`${owner}@s.whatsapp.net`, {
      text: `🕷️ *${env.botName}* is online!\n⏱️ ${new Date().toLocaleString()}`,
    });
  } catch (err) {
    logger.debug({ err }, 'startup message failed');
  }
}

/** Requests an 8-digit pairing code for the configured phone number. */
async function requestPairingCode(sock: WASocket): Promise<void> {
  const number = env.pairingNumber.replace(/[^0-9]/g, '');
  if (!number) {
    logger.error('LOGIN_METHOD=pairing but PAIRING_NUMBER is empty.');
    return;
  }
  await sleep(2000);
  try {
    const code = await sock.requestPairingCode(number);
    const pretty = code.match(/.{1,4}/g)?.join('-') ?? code;
    logger.info(`🔗 Pairing code for ${number}: ${pretty}`);
    logger.info('Enter it in WhatsApp → Linked Devices → Link with number.');
  } catch (err) {
    logger.error({ err }, 'Failed to request pairing code.');
  }
}
