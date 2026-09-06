import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

/** pokeapi.co — free, no key. */
const pokemon: Command = {
  name: 'pokemon',
  aliases: ['poke', 'dex'],
  category: 'fun',
  description: 'Look up a Pokémon by name or number.',
  usage: 'pokemon <name|id>',
  async run({ sock, msg, text }) {
    const q = (text || `${Math.floor(Math.random() * 898) + 1}`)
      .toLowerCase()
      .trim();
    await react(sock, msg, '⏳');
    try {
      const p = await fetchJson<any>(
        `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(q)}`,
      );
      const types = p.types.map((t: any) => t.type.name).join(', ');
      const abilities = p.abilities
        .map((a: any) => a.ability.name)
        .join(', ');
      const caption = [
        `⚡ *${p.name.toUpperCase()}* (#${p.id})`,
        '',
        `📏 Height: ${p.height / 10} m`,
        `⚖️ Weight: ${p.weight / 10} kg`,
        `🏷️ Types: ${types}`,
        `✨ Abilities: ${abilities}`,
      ].join('\n');
      const img =
        p.sprites?.other?.['official-artwork']?.front_default ??
        p.sprites?.front_default;
      if (img) {
        await sock.sendMessage(
          msg.chat,
          { image: { url: img }, caption },
          { quoted: msg.raw },
        );
      } else {
        await reply(sock, msg, caption);
      }
      await react(sock, msg, '✅');
    } catch {
      await react(sock, msg, '❌');
      await reply(sock, msg, `❌ Pokémon "${q}" not found.`);
    }
  },
};

export default pokemon;
