import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

/** api.qrserver.com — free, no key. Generates a QR image from text. */
const qr: Command = {
  name: 'qr',
  aliases: ['qrcode'],
  category: 'tools',
  description: 'Generate a QR code from text or a URL.',
  usage: 'qr <text>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *qr <text or url>*');
      return;
    }
    const url =
      `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=` +
      encodeURIComponent(text);
    await sock.sendMessage(
      msg.chat,
      { image: { url }, caption: '🔳 Here is your QR code.' },
      { quoted: msg.raw },
    );
  },
};

export default qr;
