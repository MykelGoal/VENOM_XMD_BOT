import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** evilinsult.com — free, no key (playful). */
const insult: Command = {
  name: 'insult',
  category: 'fun',
  description: 'Get a (playful) random insult.',
  usage: 'insult [@user]',
  async run({ sock, msg }) {
    try {
      const d = await fetchJson<any>(
        'https://evilinsult.com/generate_insult.php?lang=en&type=json',
      );
      const target = msg.mentions[0];
      if (target) {
        await sock.sendMessage(
          msg.chat,
          {
            text: `@${target.split('@')[0]} ${d.insult}`,
            mentions: [target],
          },
          { quoted: msg.raw },
        );
      } else {
        await reply(sock, msg, `😈 ${d.insult}`);
      }
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch an insult right now.');
    }
  },
};

export default insult;
