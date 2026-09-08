import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';
import { getFFProfile, FF_REGIONS, type FFProfile } from '../../services/freefire.service';
import { env } from '../../config';

/**
 * .ffprofile <uid> [region] — real Free Fire player info by UID.
 * Uses freefirecommunity.com (free FREEFIRE_API_KEY) with keyless fallback.
 */
const ffprofile: Command = {
  name: 'ffprofile',
  aliases: ['ffinfo', 'ffid', 'ffcheck', 'ffstalk'],
  category: 'game',
  description: 'Look up a real Free Fire player profile by UID.',
  usage: 'ffprofile <uid> [region]   e.g. .ffprofile 1633864660 ind',
  async run({ sock, msg, args }) {
    const uid = (args[0] ?? '').replace(/[^0-9]/g, '');
    const region = (args[1] ?? 'ind').toLowerCase();

    if (!uid) {
      await reply(
        sock,
        msg,
        [
          '🎮 *VENOM Free Fire — Player Lookup*',
          '',
          'Usage: `.ffprofile <uid> [region]`',
          '',
          '_Examples:_',
          '• `.ffprofile 1633864660 ind`',
          '• `.ffprofile 665951869 sg`',
          '',
          `Regions: ${FF_REGIONS.join(', ')}`,
        ].join('\n'),
      );
      return;
    }

    if (!FF_REGIONS.includes(region)) {
      await reply(
        sock,
        msg,
        `❌ Unknown region *${region}*.\nUse one of: ${FF_REGIONS.join(', ')}`,
      );
      return;
    }

    await react(sock, msg, '🔍');

    try {
      const p = await getFFProfile(uid, region);
      await react(sock, msg, '✅');
      await reply(sock, msg, formatProfile(p));
    } catch (err) {
      await react(sock, msg, '❌');
      const code = err instanceof Error ? err.message : 'UNKNOWN';
      if (code === 'NOT_FOUND') {
        await reply(
          sock,
          msg,
          `❌ No player found for UID *${uid}* in region *${region.toUpperCase()}*.\nDouble-check the UID and region.`,
        );
      } else if (code === 'RATE_LIMIT') {
        await reply(
          sock,
          msg,
          '⏳ Daily lookup limit reached. Try again later, or the owner can upgrade the Free Fire API plan.',
        );
      } else if (code === 'NO_BACKEND') {
        await reply(
          sock,
          msg,
          [
            '⚠️ Free Fire lookup is not configured.',
            '',
            env.freefire.apiKey
              ? 'The lookup service is temporarily down. Please try again shortly.'
              : '_Owner:_ set a free *FREEFIRE_API_KEY* (register at developers.freefirecommunity.com) for reliable lookups.',
          ].join('\n'),
        );
      } else {
        await reply(
          sock,
          msg,
          '⚠️ Free Fire servers didn’t respond. Please try again in a moment.',
        );
      }
    }
  },
};

function line(label: string, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return `${label} *${value}*`;
}

function formatProfile(p: FFProfile): string {
  const lines = [
    `🎮 *Free Fire Profile*`,
    `━━━━━━━━━━━━━━━`,
    line('👤 Name:', p.name),
    line('🆔 UID:', p.uid),
    line('🌍 Region:', p.region.toUpperCase()),
    line('⭐ Level:', p.level),
    line('❤️ Likes:', p.likes),
    line('🏅 Honor Score:', p.honorScore),
    '',
    line('🔫 BR Rank:', p.brRank),
    line('🔫 BR Points:', p.brPoints),
    line('⚔️ CS Rank:', p.csRank),
    line('⚔️ CS Points:', p.csPoints),
    '',
    line('🏰 Guild:', p.guildName),
    line('🏰 Guild Level:', p.guildLevel),
    line('📅 Created:', p.createdAt),
    line('🕒 Last Login:', p.lastLogin),
  ].filter(Boolean);

  lines.push('', `🕷️ _VENOM-XMD · data: ${p.source}_`);
  return lines.join('\n');
}

export default ffprofile;
