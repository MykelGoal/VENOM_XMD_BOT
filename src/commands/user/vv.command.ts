import type { proto } from '@whiskeysockets/baileys';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';

/**
 * Unlock a view-once photo/video/voice-note by re-sending it as a normal
 * message. Reply to the view-once message with `vv`.
 */
const vv: Command = {
  name: 'vv',
  aliases: ['viewonce', 'retrieve', 'reveal'],
  category: 'user',
  description: 'Reveal a view-once photo/video/voice note (reply to it).',
  usage: 'vv (reply to a view-once message)',
  ownerOnly: true,
  async run({ sock, msg }) {
    const quoted = msg.quoted;
    if (!quoted) {
      await reply(sock, msg, 'ℹ️ Reply to a *view-once* message with *vv*.');
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

    await react(sock, msg, '⏳');
    try {
      const mediaMsg = {
        key: quoted.raw.key,
        message: inner,
      } as proto.IWebMessageInfo;
      const buffer = (await downloadMediaMessage(mediaMsg, 'buffer', {})) as Buffer;

      if (imageMessage) {
        await sock.sendMessage(
          msg.chat,
          { image: buffer, caption: imageMessage.caption || '🔓 View-once unlocked.' },
          { quoted: msg.raw },
        );
      } else if (videoMessage) {
        await sock.sendMessage(
          msg.chat,
          { video: buffer, caption: videoMessage.caption || '🔓 View-once unlocked.' },
          { quoted: msg.raw },
        );
      } else if (audioMessage) {
        await sock.sendMessage(
          msg.chat,
          { audio: buffer, mimetype: audioMessage.mimetype || 'audio/ogg; codecs=opus', ptt: true },
          { quoted: msg.raw },
        );
      }
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '⚠️ Could not unlock that view-once message.');
    }
  },
};

export default vv;
