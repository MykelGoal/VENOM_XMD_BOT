import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';

/**
 * .predict — daily football match tips based on REAL team data.
 *
 * Pulls upcoming fixtures AND the live league tables from TheSportsDB (free,
 * keyless), then computes each tip from genuine signals:
 *   • recent form (W/D/L in last 5)   • league points & rank
 *   • goals scored / conceded (attack & defence strength)
 *   • home advantage
 *
 * So a tip like "Arsenal to win" is actual analysis, not a coin flip. Output
 * uses the classic tipster format with bold styling.
 *
 * IMPORTANT: still framed as tips/analysis with an 18+ / bet-responsibly note —
 * form-based analysis improves the odds of being right, it never guarantees it.
 */

const CURRENT_SEASON = '2026-2027';
const LAST_SEASON = '2025-2026';

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
  leagueId: string;
  league: string;
  date: string;
  time: string;
}

interface TeamStat {
  rank: number;
  points: number;
  played: number;
  form: string; // e.g. "WWDLW"
  gf: number; // goals for
  ga: number; // goals against
}

const predict: Command = {
  name: 'predict',
  aliases: ['tips', 'predictions', 'betcode', 'sure', 'football', 'games', 'odds'],
  category: 'fun',
  description: 'Daily football tips based on real team form & standings.',
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
        '⚽ Couldn’t load fixtures right now. The football data service may be busy — try again shortly.',
      );
      return;
    }

    const picks = fixtures.slice(0, 5);

    // Fetch the tables for the leagues we actually need (deduped, cached).
    const neededLeagues = [...new Set(picks.map((f) => f.leagueId))];
    const tables: Record<string, Record<string, TeamStat>> = {};
    await Promise.all(
      neededLeagues.map(async (lid) => {
        tables[lid] = await getTable(lid).catch(() => ({}));
      }),
    );

    const out: string[] = [];
    picks.forEach((f, i) => {
      const table = tables[f.leagueId] || {};
      const p = predictMatch(f, table[norm(f.home)], table[norm(f.away)]);
      const title =
        i === 0 ? bold('⚽️ Prediction of the Day ⚽️') : bold(`⚽️ Football Tip ${i + 1} ⚽️`);
      out.push(title);
      out.push(`${bold('Date:')} ${fmtDate(f.date)}`);
      out.push(`${bold('League:')} ${f.league}`);
      out.push(`${bold('Match:')} ${f.home} - ${f.away}`);
      out.push(`${bold('Kick off:')} ${toWAT(f.time)} WAT`);
      out.push(`✅ ${p.tip}`);
      out.push(`✅ Odds @${p.odds}`);
      if (p.note) out.push(`📊 ${p.note}`);
      out.push('');
    });

    out.push('⚠️ _Form-based tips — analysis, NOT guaranteed. 18+. Bet responsibly._');
    out.push('🕷️ VENOM-XMD');

    await reply(sock, msg, out.join('\n'));
    await react(sock, msg, '✅');
  },
};

/** Fetch upcoming fixtures across leagues; interleave for a nice mix. */
async function getUpcomingFixtures(): Promise<Fixture[]> {
  const perLeague: Fixture[][] = await Promise.all(
    LEAGUES.map((lg) => fetchLeagueFixtures(lg.id, lg.name).catch(() => [])),
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

async function fetchLeagueFixtures(id: string, niceName: string): Promise<Fixture[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${id}`;
  const data = await getJson(url);
  const events: any[] = Array.isArray(data?.events) ? data.events : [];
  return events
    .filter((e) => e?.strHomeTeam && e?.strAwayTeam)
    .map((e) => ({
      home: String(e.strHomeTeam),
      away: String(e.strAwayTeam),
      leagueId: id,
      league: niceName,
      date: String(e.dateEvent || ''),
      time: String(e.strTime || '').slice(0, 5),
    }));
}

/**
 * Fetch a league table keyed by normalised team name. Merges last season's
 * full table (broad coverage) with the current season on top (fresh form), so
 * every team has data even when the new season table is still sparse.
 */
async function getTable(leagueId: string): Promise<Record<string, TeamStat>> {
  const [last, current] = await Promise.all([
    fetchTable(leagueId, LAST_SEASON).catch(() => ({} as Record<string, TeamStat>)),
    fetchTable(leagueId, CURRENT_SEASON).catch(() => ({} as Record<string, TeamStat>)),
  ]);
  return { ...last, ...current }; // current season overrides last where present
}

async function fetchTable(leagueId: string, season: string): Promise<Record<string, TeamStat>> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=${leagueId}&s=${season}`;
  const data = await getJson(url);
  const rows: any[] = Array.isArray(data?.table) ? data.table : [];
  const map: Record<string, TeamStat> = {};
  for (const r of rows) {
    if (!r?.strTeam) continue;
    map[norm(String(r.strTeam))] = {
      rank: toInt(r.intRank),
      points: toInt(r.intPoints),
      played: toInt(r.intPlayed),
      form: String(r.strForm || ''),
      gf: toInt(r.intGoalsFor),
      ga: toInt(r.intGoalsAgainst),
    };
  }
  return map;
}

interface Prediction {
  tip: string;
  odds: string;
  note?: string;
}

/**
 * Data-driven prediction. Builds a "strength score" for each side from real
 * form + points + goal difference + home advantage, then picks the market that
 * best fits the gap. Falls back to a stable heuristic when a team isn't in the
 * table yet (e.g. early season / cup teams).
 */
function predictMatch(f: Fixture, home?: TeamStat, away?: TeamStat): Prediction {
  // Fallback: no table data → deterministic safe pick.
  if (!home || !away) {
    const h = hash(`${f.home}|${f.away}|${f.date}`);
    const tip = h % 2 === 0 ? 'Over 1.5' : '1X (Home or Draw)';
    return { tip, odds: (1.2 + (h % 15) / 100).toFixed(2), note: 'Limited data — safe market.' };
  }

  const hs = strength(home) + 0.35; // home advantage bonus
  const as = strength(away);
  const gap = hs - as;

  // Attacking tendency → over/BTTS signals.
  const avgGoals =
    (perGame(home.gf) + perGame(away.gf) + perGame(home.ga) + perGame(away.ga)) / 2;
  const bothScore = perGame(home.gf) >= 1 && perGame(away.gf) >= 1;

  let tip: string;
  let base: number; // odds * 100
  let note: string;

  if (gap >= 1.3) {
    tip = `${f.home} to win`;
    base = 150 - clamp(gap * 8, 0, 35); // stronger gap → lower odds
    note = `${f.home} ${formNice(home.form)} vs ${f.away} ${formNice(away.form)}.`;
  } else if (gap <= -1.0) {
    tip = `${f.away} to win`;
    base = 175 - clamp(-gap * 8, 0, 35);
    note = `${f.away} in better form (${formNice(away.form)}).`;
  } else if (gap >= 0.4) {
    tip = '1X (Home or Draw)';
    base = 122 + (hashPct(f) % 12);
    note = `${f.home} edge at home — safe double chance.`;
  } else if (gap <= -0.4) {
    tip = 'X2 (Away or Draw)';
    base = 128 + (hashPct(f) % 14);
    note = `${f.away} slight edge — cover the draw.`;
  } else if (avgGoals >= 2.6 || bothScore) {
    tip = avgGoals >= 3 ? 'Over 2.5' : 'BTTS (Both teams to score)';
    base = avgGoals >= 3 ? 165 + (hashPct(f) % 30) : 158 + (hashPct(f) % 25);
    note = `Both attacks scoring freely (~${avgGoals.toFixed(1)} goals/game).`;
  } else {
    tip = 'Over 1.5';
    base = 120 + (hashPct(f) % 15);
    note = 'Evenly matched — lean on goals market.';
  }

  const odds = (clamp(base, 108, 260) / 100).toFixed(2);
  return { tip, odds, note };
}

/** Team strength from real signals: form + points/game + goal diff/game. */
function strength(t: TeamStat): number {
  const formScore = formPoints(t.form); // 0..3 avg
  const ppg = t.played > 0 ? t.points / t.played : 1.2; // 0..3
  const gdpg = t.played > 0 ? (t.gf - t.ga) / t.played : 0; // goal diff per game
  const rankBonus = t.rank > 0 ? Math.max(0, 1 - (t.rank - 1) * 0.05) : 0.3;
  return formScore * 0.9 + ppg * 0.8 + gdpg * 0.5 + rankBonus;
}

/** Average points from a form string like "WWDLW" (W=3, D=1, L=0). */
function formPoints(form: string): number {
  const chars = form.replace(/[^WDL]/gi, '').toUpperCase().split('');
  if (!chars.length) return 1.2;
  const total = chars.reduce((s, c) => s + (c === 'W' ? 3 : c === 'D' ? 1 : 0), 0);
  return total / chars.length;
}

function formNice(form: string): string {
  const f = form.replace(/[^WDL]/gi, '').toUpperCase().slice(-5);
  return f ? `[${f}]` : '[N/A]';
}

function perGame(total: number): number {
  return total > 0 ? total / 38 : 0; // rough per-match rate; season-agnostic guard
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// ── helpers ──────────────────────────────────────────────────────
async function getJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (VENOM-XMD)' },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function toInt(v: any): number {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Normalise team names so fixture names match table names. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(fc|cf|afc|sc|ac|club|deportivo|calcio)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function hashPct(f: Fixture): number {
  return hash(`${f.home}|${f.away}|${f.date}`) % 100;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** API time is UTC; WAT is UTC+1. */
function toWAT(hhmm: string): string {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h)) return hhmm || '--:--';
  const wat = (h + 1) % 24;
  return `${String(wat).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

/** ASCII → bold unicode. */
function bold(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code >= 65 && code <= 90) out += String.fromCodePoint(0x1d400 + (code - 65));
    else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x1d41a + (code - 97));
    else if (code >= 48 && code <= 57) out += String.fromCodePoint(0x1d7ce + (code - 48));
    else out += ch;
  }
  return out;
}

export default predict;
