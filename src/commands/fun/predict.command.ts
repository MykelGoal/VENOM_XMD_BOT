import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';

/**
 * .predict — daily football match tips (analysis, NOT guaranteed wins).
 *
 * Pulls REAL upcoming fixtures from TheSportsDB (free, keyless) across the top
 * leagues, then produces a stable tip per match (market pick + fake-but-plausible
 * odds). Same match always yields the same tip (deterministic hash) so it never
 * flip-flops when re-run.
 *
 * Output uses the classic "tipster" format with bold unicode styling.
 * IMPORTANT: framed as tips/analysis with an 18+ / bet-responsibly disclaimer.
 */

// League id → display name (TheSportsDB league ids).
const LEAGUES: Array<{ id: string; name: string }> = [
  { id: '4480', name: 'Champions League' },
  { id: '4328', name: 'Premier League' },
  { id: '4335', name: 'La Liga' },
  { id: '4332', name: 'Serie A' },
  { id: '4331', name: 'Bundesliga' },
  { id: '4334', name: 'Ligue 1' },
  { id: '4337', name: 'Eredivisie Netherlands' },
];

interface Fixture {
  home: string;
  away: string;
  league: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (UTC from API)
}

const predict: Command = {
  name: 'predict',
  aliases: ['tips', 'predictions', 'betcode', 'sure', 'football', 'games', 'odds'],
  category: 'fun',
  description: 'Daily football match tips (analysis only — not guaranteed).',
  usage: 'predict',
  async run({ sock, msg }) {
    await react(sock, msg, '⚽');

    let fixtures: Fixture[] = [];
    try {
      fixtures = await getUpcomingFixtures();
    } catch {
      /* handled below */
    }

    if (!fixtures.length) {
      await react(sock, msg, '❌');
      await reply(
        sock,
        msg,
        '⚽ Couldn’t load fixtures right now. The football data service may be busy — try again in a bit.',
      );
      return;
    }

    const picks = fixtures.slice(0, 5);
    const out: string[] = [];

    picks.forEach((f, i) => {
      const p = predictMatch(f);
      const title =
        i === 0 ? bold('⚽️ Prediction of the Day ⚽️') : bold(`⚽️ Football Tip ${i + 1} ⚽️`);
      out.push(title);
      out.push(`${bold('Date:')} ${fmtDate(f.date)}`);
      out.push(`${bold('League:')} ${f.league}`);
      out.push(`${bold('Match:')} ${f.home} - ${f.away}`);
      out.push(`${bold('Kick off:')} ${toWAT(f.time)} WAT`);
      out.push(`✅ ${p.tip}`);
      out.push(`✅ Odds @${p.odds}`);
      out.push('');
    });

    out.push('⚠️ _Tips are analysis/opinion, NOT guaranteed. 18+. Bet responsibly._');
    out.push('🕷️ VENOM-XMD');

    await reply(sock, msg, out.join('\n'));
    await react(sock, msg, '✅');
  },
};

/** Fetch upcoming fixtures across leagues; interleave for a nice mix. */
async function getUpcomingFixtures(): Promise<Fixture[]> {
  const perLeague: Fixture[][] = await Promise.all(
    LEAGUES.map((lg) => fetchLeague(lg.id, lg.name).catch(() => [])),
  );
  const mixed: Fixture[] = [];
  let added = true;
  for (let idx = 0; added; idx++) {
    added = false;
    for (const list of perLeague) {
      if (list[idx]) {
        mixed.push(list[idx]);
        added = true;
      }
    }
  }
  return mixed;
}

async function fetchLeague(id: string, niceName: string): Promise<Fixture[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${id}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (VENOM-XMD)' },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));

  if (!res.ok) return [];
  const data: any = await res.json();
  const events: any[] = Array.isArray(data?.events) ? data.events : [];
  return events
    .filter((e) => e?.strHomeTeam && e?.strAwayTeam)
    .map((e) => ({
      home: String(e.strHomeTeam),
      away: String(e.strAwayTeam),
      league: niceName,
      date: String(e.dateEvent || ''),
      time: String(e.strTime || '').slice(0, 5),
    }));
}

interface Prediction {
  tip: string;
  odds: string;
}

/**
 * Deterministic per-match tip + plausible low odds (safe-ish markets like the
 * sample: 1X, Over 1.5, Home win, Over 2.5, BTTS). Stable per fixture.
 */
function predictMatch(f: Fixture): Prediction {
  const h = hash(`${f.home}|${f.away}|${f.date}`);
  const roll = h % 100;
  let tip: string;
  let base: number; // base odds *100

  if (roll < 30) {
    tip = 'Home win';
    base = 150 + (h % 60); // 1.50–2.09
  } else if (roll < 50) {
    tip = '1X (Home or Draw)';
    base = 120 + (h % 20); // 1.20–1.39
  } else if (roll < 68) {
    tip = 'Over 1.5';
    base = 118 + (h % 18); // 1.18–1.35
  } else if (roll < 82) {
    tip = 'Over 2.5';
    base = 160 + (h % 45); // 1.60–2.04
  } else if (roll < 93) {
    tip = 'BTTS (Both teams to score)';
    base = 155 + (h % 40); // 1.55–1.94
  } else {
    tip = 'X2 (Away or Draw)';
    base = 125 + (h % 25); // 1.25–1.49
  }

  const odds = (base / 100).toFixed(2);
  return { tip, odds };
}

/** Small deterministic string hash → unsigned int. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** YYYY-MM-DD → DD/MM/YYYY. */
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** API time is UTC; WAT is UTC+1. Shift HH:MM by +1 hour. */
function toWAT(hhmm: string): string {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h)) return hhmm || '--:--';
  const wat = (h + 1) % 24;
  return `${String(wat).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

/** Convert ASCII letters/digits to their bold unicode variants. */
function bold(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code >= 65 && code <= 90) out += String.fromCodePoint(0x1d400 + (code - 65)); // A-Z
    else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x1d41a + (code - 97)); // a-z
    else if (code >= 48 && code <= 57) out += String.fromCodePoint(0x1d7ce + (code - 48)); // 0-9
    else out += ch;
  }
  return out;
}

export default predict;
