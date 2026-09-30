import { Boom } from '@hapi/boom';
import type { WASocket } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { env } from '../config';
import { logger } from '../utils/logger';
import { sleep } from '../utils/helpers';
import { createClient } from './client';
import { registerEventHandlers } from '../handlers/event.handler';
import { registerVtuNotifier, resumePendingVtu, setVtuBotPhone } from '../services/vtu.service';
import { sendText } from '../services/message.service';
import { syncSessionToCloud } from './session';
import { getBaileys } from './baileys';
import {
  clearCompleteAuthState,
  completeAuthPersistenceConfigured,
  persistCompleteAuthState,
} from './auth-persistence';

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

  // Give the VTU payment poller a way to message users proactively
  // ("✅ your wallet don credit") without an active command.
  registerVtuNotifier((jid, text) => sendText(sock, jid, text));

  // Remember our own number so payment redirects (wa.me) land the customer
  // back in this chat after paying.
  setVtuBotPhone(sock.user?.id ?? '');

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
      if (completeAuthPersistenceConfigured()) {
        await persistCompleteAuthState().catch((err) =>
          logger.error({ err }, 'Initial complete auth-state backup failed'),
        );
      } else {
        logger.warn('WhatsApp auth state is not redeploy-safe. Configure MONGO_URI and AUTH_STATE_SECRET before relying on this session.');
      }
      await sendStartupMessage(sock);

      // Resume watching any payments that were pending before a restart —
      // money must never get lost to a redeploy.
      resumePendingVtu();
    }

    // ── Closed / reconnect logic ──────────────────────────────
    if (connection === 'close') {
      const { DisconnectReason } = getBaileys();
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const replaced = statusCode === DisconnectReason.connectionReplaced;

      if (loggedOut) {
        await clearCompleteAuthState().catch((err) =>
          logger.error({ err }, 'Could not clear logged-out auth archive'),
        );
        logger.error(
          '❌ Logged out. Delete the /sessions folder and log in again.',
        );
        return;
      }

      if (replaced) {
        // Code 440 means another process opened the same WhatsApp credentials.
        // Reconnecting here makes both instances continuously kick each other.
        // Exit once and let Render restart after the old/test instance is gone.
        logger.error(
          '⚠️ Session was replaced by another bot instance (code 440). Restarting this process to stop a reconnect loop...',
        );
        await sleep(1000);
        process.exit(1);
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
