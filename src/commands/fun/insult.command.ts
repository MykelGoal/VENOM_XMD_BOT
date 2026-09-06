import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** Built-in playful insults — used offline and as an API fallback. */
const FALLBACK = [
  'You have the perfect face for radio.',
  'You bring everyone so much joy... when you leave the room.',
  "You're not stupid; you just have bad luck thinking.",
  'I would agree with you, but then we would both be wrong.',
  'You have something on your chin... no, the third one down.',
  "You're the reason the gene pool needs a lifeguard.",
  'Somewhere out there a tree is working hard to replace the oxygen you waste.',
  "You're proof that even evolution takes days off.",
  'Your secrets are always safe with me — I never even listen.',
  "I'd explain it to you, but I left my crayons at home.",
  'You are as useless as the "ueue" in "queue".',
  "You're like a cloud — when you disappear, it's a beautiful day.",
  'If laughter is the best medicine, your face must be curing the whole town.',
  'You have the right to remain silent, because whatever you say will probably be stupid anyway.',
  'Brains are not everything. In your case they are nothing.',
];

/** evilinsult.com — free, no key (playful). Falls back to a built-in list. */
const insult: Command = {
  name: 'insult',
  category: 'fun',
  description: 'Get a (playful) random insult.',
  usage: 'insult [@user]',
  async run({ sock, msg }) {
    let line = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    try {
      const d = await fetchJson<any>(
        'https://evilinsult.com/generate_insult.php?lang=en&type=json',
      );
      if (d?.insult) line = d.insult;
    } catch {
      /* keep the built-in fallback */
    }

    const target = msg.mentions[0];
    if (target) {
      await sock.sendMessage(
        msg.chat,
        { text: `@${target.split('@')[0]} ${line}`, mentions: [target] },
        { quoted: msg.raw },
      );
    } else {
      await reply(sock, msg, `😈 ${line}`);
    }
  },
};

export default insult;
