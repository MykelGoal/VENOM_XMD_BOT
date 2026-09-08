import type { proto } from '@whiskeysockets/baileys';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { env } from '../../config';

/**
 * .vvpr — like .vv, but STEALTH: it unlocks a view-once photo/video/voice note
 * and sends it PRIVATELY to the owner's DM instead of the current chat. The
 * sender never sees anything happen in the chat, and the command message is
 * deleted so there's no trace. Owner-only.
 *
 * Reply to a view-once message with `.vvpr`.
 */
const vvpr: Command = {
  name: 'vvpr',
  aliases: ['vvv', 'vvprivate', 'stealthvv'],
  category: 'user',
  description: 'Reveal a view-once message privately to the owner (stealth).',
  usage: 'vvpr (reply to a view-once message)',
  ownerOnly: true,
  async run({ sock, msg }) {
    const quoted = msg.quoted;
    if (!quoted) {
      await reply(sock, msg, 'ℹ️ Reply to a *view-once* message with *vvpr*.');
      return;
    }

    // Unwrap possible viewOnce wrappers to reach the real media node.
    const raw: any = quoted.raw.message;
    const inner =
      raw?.viewOnceMessageV2?.message ??
      raw?.viewOnceMessageV2Extension?.message ??
      raw?.viewOnceMessage?.message ??
      raw;

    const imageMessage = inner?.imageMessage;
    const videoMessage = inner?.videoMessage;
    const audioMessage = inner?.audioMessage;

    if (!imageMessage && !videoMessage && !audioMessage) {
      await reply(sock, msg, '❌ That is not a view-once photo, video or voice note.');
      return;
    }

    // Where to send it privately.
    const owner = env.ownerNumbers[0];
    if (!owner) {
      await reply(
        sock,
        msg,
        '⚠️ No OWNER_NUMBER configured, so I can’t send it privately.',
      );
      return;
    }
    const ownerJid = `${owner.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

    try {
      const mediaMsg = {
        key: quoted.raw.key,
        message: inner,
      } as proto.IWebMessageInfo;
      const buffer = (await downloadMediaMessage(mediaMsg, 'buffer', {})) as Buffer;

      // Build a little context header so the owner knows where it came from.
      const fromNumber = quoted.sender
        ? quoted.sender.split('@')[0]
        : msg.senderNumber;
      const where = msg.isGroup ? `group chat` : `private chat`;
      const header =
        `🔓 *Stealth view-once*\n` +
        `👤 From: wa.me/${fromNumber}\n` +
        `💬 Seen in: ${where}`;

      if (imageMessage) {
        await sock.sendMessage(ownerJid, {
          image: buffer,
          caption: `${header}${imageMessage.caption ? `\n📝 ${imageMessage.caption}` : ''}`,
        });
      } else if (videoMessage) {
        await sock.sendMessage(ownerJid, {
          video: buffer,
          caption: `${header}${videoMessage.caption ? `\n📝 ${videoMessage.caption}` : ''}`,
        });
      } else if (audioMessage) {
        await sock.sendMessage(ownerJid, {
          audio: buffer,
          mimetype: audioMessage.mimetype || 'audio/ogg; codecs=opus',
          ptt: true,
        });
        await sock.sendMessage(ownerJid, { text: header });
      }

      // STEALTH: delete the ".vvpr" command message so no one sees it happened.
      try {
        await sock.sendMessage(msg.chat, { delete: msg.raw.key });
      } catch {
        // If deletion isn't possible, silently give the owner a private heads-up
        // rather than leaving a visible reply in the chat.
        await sock.sendMessage(ownerJid, {
          text: '⚠️ Sent, but I could not delete your .vvpr command in the chat — delete it manually for full stealth.',
        });
      }
    } catch {
      // Only the owner hears about failures — keep the chat clean.
      await sock.sendMessage(ownerJid, {
        text: '⚠️ Could not unlock/forward that view-once message.',
      }).catch(() => {});
    }
  },
};

export default vvpr;
