import type { WASocket } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import type { FreeFireRole } from '../database/models/groupbrain.model';
import { groupBrainRepo } from '../database/repositories/groupbrain.repo';
import { flushMongo } from '../database/mongo';
import {
  FF_REGIONS,
  getFFProfile,
  hasFreeFireApiKey,
} from './freefire.service';
import { reply } from './message.service';
import { logger } from '../utils/logger';

export interface ParsedIntroduction {
  preferredName?: string;
  freeFireName?: string;
  freeFireUid?: string;
  region?: string;
  role?: FreeFireRole;
}

const INTRO_CUE = /\b(?:introduc(?:e|tion)|my name|call me|i['’]?m|i am|ign|in[ -]?game name|ff name|free\s*fire name|uid|server|rusher|sniper|support|all[ -]?rounder)\b/i;

function cleanName(value: string | undefined): string | undefined {
  const cleaned = value
    ?.replace(/^[\s:=-]+|[\s,;|.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  return cleaned && cleaned.length >= 2 ? cleaned : undefined;
}

function captured(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const value = cleanName(match?.[1]);
    if (value) return value;
  }
  return undefined;
}

function parseRole(text: string): FreeFireRole | undefined {
  if (/\b(?:igl|in[ -]?game leader|shot[ -]?caller)\b/i.test(text)) return 'igl';
  if (/\bsniper\b/i.test(text)) return 'sniper';
  if (/\bsupport(?:er)?\b/i.test(text)) return 'support';
  if (/\brusher\b/i.test(text)) return 'rusher';
  if (/\ball[ -]?rounder\b|\bany role\b/i.test(text)) return 'all-rounder';
  return undefined;
}

/** Parse a natural or labelled newcomer introduction without using AI quota. */
export function parseMemberIntroduction(text: string): ParsedIntroduction | null {
  const source = text.replace(/\r/g, '').trim();
  if (!source || !INTRO_CUE.test(source)) return null;

  const freeFireUid = source.match(/\b(?:uid\s*(?:is|na|:|-)?\s*)?(\d{6,15})\b/i)?.[1];
  // Region codes such as ME/US are ordinary words in chat, so require an
  // adjacent “server”/“region” label instead of guessing from a bare token.
  const regionMatch = new RegExp(
    `\\b(${FF_REGIONS.join('|')})\\b\\s*(?:server|region)\\b|\\b(?:server|region)\\s*(?:is|na|:|-)?\\s*(${FF_REGIONS.join('|')})\\b`,
    'i',
  ).exec(source);
  const regionAlias = /\b(?:middle\s*east|mena)\b/i.test(source)
    ? 'ME'
    : /\bsub[ -]?saharan africa\b/i.test(source)
      ? 'SSA'
      : undefined;

  let preferredName = captured(source, [
    /(?:^|[,;|\n])\s*(?:preferred\s+)?name\s*(?:is|na|:|-)?\s*([^,;|\n]+)/i,
    /\bmy name\s*(?:is|na|:|-)?\s*([^,;|\n]+)/i,
    /\bcall me\s+([^,;|\n]+)/i,
    /\bi(?:'m| am)\s+([^,;|\n]+)/i,
  ]);
  let freeFireName = captured(source, [
    /(?:^|[,;|\n])\s*(?:ff|free\s*fire|in[ -]?game|ign)\s*(?:name)?\s*(?:is|na|:|-)?\s*([^,;|\n]+)/i,
    /\b(?:ign|ff name|free\s*fire name)\s*(?:is|na|:|-)?\s*([^,;|\n]+)/i,
  ]);

  // Compact form: Name | IGN | UID | ME | Rusher
  const parts = source.split('|').map((part) => cleanName(part)).filter(Boolean) as string[];
  if (parts.length >= 5 && parts.some((part) => /^\d{6,15}$/.test(part))) {
    preferredName ??= parts[0];
    freeFireName ??= parts[1];
  }
  const compactRegion = parts.find((part) =>
    FF_REGIONS.includes(part.toLowerCase()),
  )?.toUpperCase();

  // Remove labels accidentally captured as part of a name.
  preferredName = preferredName?.replace(/\s+(?:ign|ff name|uid|server)\b.*$/i, '').trim();
  freeFireName = freeFireName?.replace(/\s+(?:uid|server|role)\b.*$/i, '').trim();

  return {
    preferredName: cleanName(preferredName),
    freeFireName: cleanName(freeFireName),
    freeFireUid,
    region:
      regionAlias ??
      (regionMatch?.[1] || regionMatch?.[2])?.toUpperCase() ??
      compactRegion,
    role: parseRole(source),
  };
}

function missingFields(intro: ParsedIntroduction): string[] {
  const missing: string[] = [];
  if (!intro.preferredName) missing.push('preferred name');
  if (!intro.freeFireName) missing.push('Free Fire name/IGN');
  if (!intro.freeFireUid) missing.push('UID');
  if (!intro.region) missing.push('server/region');
  if (!intro.role) missing.push('playing role');
  return missing;
}

export function onboardingPrompt(): string {
  return [
    '👋 Send one short introduction:',
    '• Preferred name',
    '• Free Fire name (IGN)',
    '• UID',
    '• Server/region',
    '• Role: Rusher, Sniper, Support, IGL or All-rounder',
    '',
    '_Example: My name is David, IGN DARK KING, UID 1234567890, ME server, Rusher._',
  ].join('\n');
}

/** Handle a pending member introduction. Returns true only when it engaged. */
export async function handleOnboardingIntroduction(
  sock: WASocket,
  msg: SerializedMessage,
): Promise<boolean> {
  if (!msg.isGroup || !groupBrainRepo.needsIntroduction(msg.chat, msg.senderNumber)) {
    return false;
  }
  const parsed = parseMemberIntroduction(msg.body);
  if (!parsed) return false; // ordinary chat from a pending newcomer

  const missing = missingFields(parsed);
  if (missing.length) {
    await reply(
      sock,
      msg,
      `I understood part of your introduction, but I still need: *${missing.join(', ')}*.\n\n${onboardingPrompt()}`,
    );
    return true;
  }

  groupBrainRepo.saveIntroduction(msg.chat, msg.senderNumber, {
    preferredName: parsed.preferredName!,
    freeFireName: parsed.freeFireName!,
    freeFireUid: parsed.freeFireUid!,
    region: parsed.region!,
    role: parsed.role!,
  });
  await flushMongo();

  await reply(
    sock,
    msg,
    [
      `✅ Welcome, *${parsed.preferredName}*. Introduction saved.`,
      `🎮 IGN: *${parsed.freeFireName}* · UID: *${parsed.freeFireUid}*`,
      `🌍 ${parsed.region} · Role: *${parsed.role}*`,
      hasFreeFireApiKey()
        ? '_I’ll verify the public game profile separately._'
        : '_UID verification is pending until the profile service is configured._',
    ].join('\n'),
  );

  if (hasFreeFireApiKey()) {
    void verifyIntroduction(sock, msg, parsed.freeFireUid!, parsed.region!);
  }
  return true;
}

async function verifyIntroduction(
  sock: WASocket,
  msg: SerializedMessage,
  uid: string,
  region: string,
): Promise<void> {
  try {
    const profile = await getFFProfile(uid, region.toLowerCase());
    groupBrainRepo.updateIntroductionVerification(
      msg.chat,
      msg.senderNumber,
      'verified',
      profile.name,
    );
    await flushMongo();
    await sock.sendMessage(
      msg.chat,
      {
        text: `✅ Public profile lookup matched @${msg.senderNumber}’s UID${profile.name ? ` as *${profile.name}*` : ''}.`, 
        mentions: [msg.sender],
      },
      { quoted: msg.raw },
    );
  } catch (err) {
    const code = (err as Error)?.message ?? '';
    groupBrainRepo.updateIntroductionVerification(
      msg.chat,
      msg.senderNumber,
      code === 'NOT_FOUND' ? 'mismatch' : 'unavailable',
    );
    await flushMongo();
    logger.debug({ err, uid, region }, 'Newcomer UID verification unavailable');
    if (code === 'NOT_FOUND') {
      await sock.sendMessage(
        msg.chat,
        {
          text: `🟡 @${msg.senderNumber}, I couldn’t match that UID on *${region}*. Your introduction is saved, but an admin should check the UID/region.`,
          mentions: [msg.sender],
        },
        { quoted: msg.raw },
      );
    }
  }
}
