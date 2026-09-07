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
      await onFirstConnect(sock);
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

/**
 * Runs ONCE after the very first successful connection on this deployment:
 * auto-joins the official support group and sends the new owner a rich
 * welcome with channel / group / GitHub links. Guarded by a persisted flag
 * so it never re-fires on reconnects.
 */
async function onFirstConnect(sock: WASocket): Promise<void> {
  try {
    const { settingsRepo } = await import(
      '../database/repositories/settings.repo'
    );
    if (settingsRepo.getBool('welcomed')) return; // already done
    settingsRepo.setBool('welcomed', true);

    // Small delay so the socket is fully ready before we act.
    await sleep(4000);

    let joinedGroup = false;

    // ── Auto-join the official support group (free community growth) ──
    if (env.social.autoJoinGroup && env.social.supportGroup) {
      const code = extractInviteCode(env.social.supportGroup);
      if (code) {
        try {
          await sock.groupAcceptInvite(code);
          joinedGroup = true;
          logger.info('🤝 Auto-joined the official support group.');
        } catch (err) {
          logger.debug({ err }, 'auto-join support group failed');
        }
      }
    }

    // ── Send the new owner a rich welcome ─────────────────────────
    const owner = env.ownerNumbers[0];
    if (!owner) return;

    const lines = [
      `🕷️ *${env.botName} is connected!* ✅`,
      '',
      `Welcome to the crew. Your bot is live and ready — ${'over 400'} commands at your command.`,
      '',
      '📢 *Follow our WhatsApp Channel* for updates & new features:',
      env.social.whatsappChannel,
      '',
    ];
    if (env.social.supportGroup) {
      lines.push(
        joinedGroup
          ? '🤝 We added you to our *support group* — say hi! 👋'
          : '🤝 *Join our support group:*',
        env.social.supportGroup,
        '',
      );
    }
    lines.push(
      `⭐ *Star us on GitHub:* github.com/${env.social.githubRepo}`,
      `🎵 *TikTok:* ${env.social.tiktokHandle}`,
      '',
      `Type *.menu* to see everything I can do. 🚀`,
    );

    await sock.sendMessage(`${owner}@s.whatsapp.net`, {
      text: lines.join('\n'),
    });
    logger.info('👋 Sent first-connect welcome to owner.');
  } catch (err) {
    logger.debug({ err }, 'onFirstConnect failed');
  }
}

/** Extracts the invite code from a chat.whatsapp.com link or raw code. */
function extractInviteCode(link: string): string | null {
  const m = link.match(/chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]+)/);
  if (m) return m[1];
  // Allow passing a bare code too.
  if (/^[0-9A-Za-z]{18,24}$/.test(link.trim())) return link.trim();
  return null;
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
