import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { apk } from '../../services/download.service';

const apkCmd: Command = {
  name: 'apk',
  aliases: ['apkdl', 'app'],
  category: 'downloader',
  description: 'Search and download an Android app (APK).',
  usage: 'apk <app name>',
  async run({ sock, msg, text }) {
    if (!text) {
      await reply(sock, msg, 'ℹ️ Usage: *apk <app name>*\n\nExample: _apk whatsapp_');
      return;
    }
    await react(sock, msg, '⏳');
    try {
      const a = await apk(text);
      await sock.sendMessage(
        msg.chat,
        {
          document: { url: a.url },
          mimetype: 'application/vnd.android.package-archive',
          fileName: `${a.name}.apk`.replace(/[\\/:*?"<>|]/g, ''),
        },
        { quoted: msg.raw },
      );
      await reply(
        sock,
        msg,
        `📦 *${a.name}*\n🔖 Version: ${a.version || 'n/a'}${
          a.packageName ? `\n📦 ${a.packageName}` : ''
        }`,
      );
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, '❌ Could not find/download that app.');
    }
  },
};

export default apkCmd;
