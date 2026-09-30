import sharp from 'sharp';
import type { GroupActivitySummary } from '../database/repositories/groupstats.repo';
import type { FFProfile } from './freefire.service';

function xml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function baseSvg(title: string, subtitle: string, content: string): string {
  return `
  <svg width="1200" height="675" viewBox="0 0 1200 675" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#09090b"/><stop offset="0.58" stop-color="#18181b"/><stop offset="1" stop-color="#3f0712"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="#fb7185"/><stop offset="1" stop-color="#e11d48"/>
      </linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity=".48"/></filter>
    </defs>
    <rect width="1200" height="675" rx="32" fill="url(#bg)"/>
    <circle cx="1100" cy="90" r="190" fill="#e11d48" opacity=".08"/>
    <circle cx="80" cy="650" r="250" fill="#fb7185" opacity=".05"/>
    <rect x="64" y="55" width="12" height="82" rx="6" fill="url(#accent)"/>
    <text x="100" y="91" fill="#fafafa" font-family="Arial, sans-serif" font-size="40" font-weight="700">${xml(title)}</text>
    <text x="101" y="129" fill="#a1a1aa" font-family="Arial, sans-serif" font-size="21">${xml(subtitle)}</text>
    ${content}
    <text x="66" y="637" fill="#71717a" font-family="Arial, sans-serif" font-size="18">VENOM • operational report • Africa/Lagos</text>
  </svg>`;
}

function metric(x: number, y: number, label: string, value: string, note: string): string {
  return `
    <g filter="url(#shadow)">
      <rect x="${x}" y="${y}" width="244" height="148" rx="22" fill="#18181b" stroke="#3f3f46"/>
      <text x="${x + 24}" y="${y + 37}" fill="#a1a1aa" font-family="Arial, sans-serif" font-size="18">${xml(label)}</text>
      <text x="${x + 24}" y="${y + 91}" fill="#fafafa" font-family="Arial, sans-serif" font-size="44" font-weight="700">${xml(value)}</text>
      <text x="${x + 24}" y="${y + 124}" fill="#fb7185" font-family="Arial, sans-serif" font-size="16">${xml(note)}</text>
    </g>`;
}

export async function renderActivityCard(input: {
  groupName: string;
  memberCount: number;
  introductions: number;
  summary: GroupActivitySummary;
}): Promise<Buffer> {
  const trend = input.summary.changePct === undefined
    ? 'new baseline'
    : `${input.summary.changePct >= 0 ? '+' : ''}${input.summary.changePct}% previous period`;
  const content = [
    metric(66, 188, 'MEANINGFUL MESSAGES', String(input.summary.meaningfulMessages), trend),
    metric(326, 188, 'ACTIVE MEMBERS', String(input.summary.uniqueActive), `${input.memberCount} group members`),
    metric(586, 188, 'HIGHLY ACTIVE', String(input.summary.highlyActive), `${input.summary.active} active · ${input.summary.light} light`),
    metric(846, 188, 'INTRODUCTIONS', String(input.introductions), 'saved profiles'),
    `<rect x="66" y="368" width="1024" height="188" rx="24" fill="#111113" stroke="#3f3f46"/>`,
    `<text x="98" y="417" fill="#a1a1aa" font-family="Arial, sans-serif" font-size="19">PEAK DAY</text>`,
    `<text x="98" y="473" fill="#fafafa" font-family="Arial, sans-serif" font-size="38" font-weight="700">${xml(input.summary.peakDate || 'No activity yet')}</text>`,
    `<text x="98" y="515" fill="#fb7185" font-family="Arial, sans-serif" font-size="20">${input.summary.peakMessages} meaningful messages</text>`,
    `<text x="620" y="417" fill="#a1a1aa" font-family="Arial, sans-serif" font-size="19">MEASUREMENT</text>`,
    `<text x="620" y="463" fill="#e4e4e7" font-family="Arial, sans-serif" font-size="21">Commands and bot output excluded</text>`,
    `<text x="620" y="503" fill="#e4e4e7" font-family="Arial, sans-serif" font-size="21">Rolling ${input.summary.days}-day aggregate</text>`,
  ].join('');
  const svg = baseSvg(input.groupName.slice(0, 42), 'Community activity intelligence', content);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderFreeFireProfileCard(profile: FFProfile): Promise<Buffer> {
  const rows = [
    ['UID', profile.uid],
    ['REGION', profile.region.toUpperCase()],
    ['LEVEL', profile.level ?? 'Not returned'],
    ['BR RANK', profile.brRank ?? 'Not returned'],
    ['LIKES', profile.likes ?? 'Not returned'],
    ['GUILD', profile.guildName ?? 'Not returned'],
  ];
  const badges = profile.badges?.length ? profile.badges.join(' · ') : 'No verified badges returned';
  const rowSvg = rows.map(([label, value], index) => {
    const x = index % 3;
    const y = Math.floor(index / 3);
    return metric(66 + x * 344, 188 + y * 168, String(label), String(value).slice(0, 18), y === 0 && x === 0 ? 'public lookup response' : 'provider response');
  }).join('');
  const content = [
    rowSvg,
    `<rect x="66" y="538" width="1024" height="62" rx="18" fill="#111113" stroke="#3f3f46"/>`,
    `<text x="94" y="578" fill="#e4e4e7" font-family="Arial, sans-serif" font-size="20">BADGES  ${xml(badges.slice(0, 86))}</text>`,
  ].join('');
  const svg = baseSvg(profile.name || 'Free Fire Profile', `Public profile lookup • ${profile.source}`, content);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
