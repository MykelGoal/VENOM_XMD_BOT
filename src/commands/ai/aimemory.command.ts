import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { settingsRepo } from '../../database/repositories/settings.repo';
import { isSudo } from '../../middleware/permission';
import { memoryEnabled } from '../../middleware/aimode';
import { chatMemoryRepo } from '../../database/repositories/chatmemory.repo';
import { memorySyncEnabled, forgetRemote, wipeRemoteAll } from '../../services/memorysync.service';

/**
 * AI conversation memory control.
 *   .aimemory            → status: is the bot remembering this chat?
 *   .aimemory clear      → wipe THIS chat's memory (anyone — your chat, your privacy)
 *   .aimemory on | off   → global toggle (owner/sudo only)
 *
 * Memory is bounded (16 messages/chat, ~24h) and ON by default. When the
 * owner set MEMORY_URL, memory is also encrypted + synced to a free remote
 * store so it survives redeploys.
 */
const aimemory: Command = {
  name: 'aimemory',
  aliases: ['memory', 'forget'],
  category: 'ai',
  description: 'Show / clear / toggle AI conversation memory (what the bot remembers).',
  usage: 'aimemory [ clear | on | off ]',
  async run({ sock, msg, args }) {
    const arg = args[0]?.toLowerCase();

    // .aimemory clear — anyone may wipe the memory of the chat they're in.
    if (arg === 'clear' || arg === 'forget') {
      const other = args[1]?.toLowerCase();

      if (other === 'all' && isSudo(msg.senderNumber)) {
        const chats = chatMemoryRepo.active(1000);
        for (const c of chats) chatMemoryRepo.clear(c.chat);
        await wipeRemoteAll().catch(() => {}); // forget remotely too
        await reply(sock, msg, `🧹 Memory wiped for *${chats.length} chat(s)* — local and remote.`);
        return;
      }

      const forgot = chatMemoryRepo.clear(msg.chat);
      await forgetRemote(msg.chat); // don't let a redeploy resurrect it
      await reply(
        sock,
        msg,
        forgot
          ? '🧹 Done — I have forgotten this conversation.'
          : '🤷 I had nothing stored for this chat yet.',
      );
      return;
    }

    // .aimemory on|off — owner/sudo only.
    if (arg === 'on' || arg === 'off') {
      if (!isSudo(msg.senderNumber)) {
        await reply(sock, msg, '🚫 Only the bot owner can toggle memory globally.');
        return;
      }
      settingsRepo.set('aimemory', arg);
      await reply(
        sock,
        msg,
        arg === 'on'
          ? '🧠 Memory ON — I will remember the last few turns of each chat (~24h).'
          : '🧠 Memory OFF — each reply starts fresh. Existing memories stay until they expire.',
      );
      return;
    }

    if (arg) {
      await reply(sock, msg, 'ℹ️ Usage: *aimemory [ clear | on | off ]*');
      return;
    }

    // .aimemory — status for this chat.
    const enabled = memoryEnabled();
    const sync = memorySyncEnabled();
    const turns = Math.ceil(chatMemoryRepo.history(msg.chat).length / 2);
    await reply(
      sock,
      msg,
      `🧠 *AI memory*\n\n` +
        `• Global: *${enabled ? 'ON' : 'OFF'}*\n` +
        `• This chat: *${turns} turn(s)* remembered (max 8, ~24h)\n` +
        `• Remote sync: *${sync ? 'ON (encrypted, survives redeploys)' : 'off'}*\n\n` +
        (enabled
          ? '_Use `.aimemory clear` if you want me to forget this chat._'
          : '_Owner: enable with `.aimemory on`._') +
        (sync && isSudo(msg.senderNumber) ? '\n_Owner: `.aimemory clear all` wipes every chat._' : ''),
    );
  },
};

export default aimemory;
