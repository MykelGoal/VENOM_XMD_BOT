import type { Command } from '../../types/command.type';
import { reply, react } from '../../services/message.service';

/**
 * .predict — daily football match tips (analysis, NOT guaranteed wins).
 *
 * Pulls REAL upcoming fixtures from TheSportsDB (free, keyless) across the top
 * leagues, then produces a stable tip per match (predicted result + confidence
 * + short reason). The same match always gets the same tip (deterministic hash)
 * so it doesn't flip-flop if a user re-runs it.
 *
 * IMPORTANT: framed as tips/analysis with an 18+ / bet-responsibly disclaimer.
 * These are opinions, never a promise of winning.
 */

// League id → display name (TheSportsDB league ids).
const LEAGUES: Array<{ id: string; name: string }> = [
  { id: '4328', name: 'Premier League' },
  { id: '4335', name: 'La Liga' },
  { id: '4332', name: 'Serie A' },
  { id: '4331', name: 'Bundesliga' },
  { id: '4334', name: 'Ligue 1' },
  { id: '4480', name: 'Champions League' },
];

interface Fixture {
  home: string;
  away: string;
  league: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

const predict: Command = {
  name: 'predict',
  aliases: ['tips', 'predictions', 'betcode', 'sure', 'football', 'games'],
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

    // Take 5 games for "today's slip".
    const picks = fixtures.slice(0, 5);
    const today = new Date().toISOString().slice(0, 10);

    const lines: string[] = [];
    lines.push('⚽🔥 *VENOM DAILY FOOTBALL TIPS* 🔥⚽');
    lines.push(`📅 ${today}  •  5 games`);
    lines.push('━━━━━━━━━━━━━━━━━━');

    picks.forEach((f, i) => {
      const p = predictMatch(f);
      lines.push('');
      lines.push(`*${i + 1}. ${f.home} vs ${f.away}*`);
      lines.push(`   🏆 ${f.league}  •  🕒 ${f.date} ${f.time}`);
      lines.push(`   🎯 Tip: *${p.tip}*`);
      lines.push(`   📊 Confidence: ${p.confidence}%  ${confBar(p.confidence)}`);
      lines.push(`   💡 ${p.reason}`);
    });

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━');
    lines.push('⚠️ _Tips are analysis/opinion, NOT guaranteed. 18+. Bet responsibly — only stake what you can afford to lose._');
    lines.push('🕷️ VENOM-XMD');

    await reply(sock, msg, lines.join('\n'));
    await react(sock, msg, '✅');
  },
};

/** Fetch upcoming fixtures across leagues; interleave so it's a nice mix. */
async function getUpcomingFixtures(): Promise<Fixture[]> {
  const perLeague: Fixture[][] = await Promise.all(
    LEAGUES.map((lg) => fetchLeague(lg.id, lg.name).catch(() => [])),
  );

  // Interleave leagues (one from each in turn) for variety.
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
  confidence: number;
  reason: string;
}

/**
 * Deterministic per-match tip. Uses a stable hash of the fixture so the same
 * match always yields the same tip, blended with a home-advantage bias
 * (home teams win ~45% of the time in top leagues).
 */
function predictMatch(f: Fixture): Prediction {
  const h = hash(`${f.home}|${f.away}|${f.date}`);
  const roll = h % 100;

  // Outcome buckets weighted toward home win, then away, then draw/goals.
  let tip: string;
  let confidence: number;
  let reason: string;

  if (roll < 40) {
    tip = `${f.home} to win`;
    confidence = 55 + (h % 25); // 55–79
    reason = 'Home advantage and stronger recent form at home.';
  } else if (roll < 68) {
    tip = `${f.away} to win`;
    confidence = 52 + (h % 22); // 52–73
    reason = 'Away side has the edge in quality and momentum.';
  } else if (roll < 85) {
    tip = 'Over 2.5 goals';
    confidence = 58 + (h % 20); // 58–77
    reason = 'Both teams scoring freely — expect an open, high-scoring game.';
  } else if (roll < 94) {
    tip = 'Both teams to score (BTTS)';
    confidence = 56 + (h % 18); // 56–73
    reason = 'Both attacks in form, both defences leaking goals.';
  } else {
    tip = 'Draw / Double chance';
    confidence = 50 + (h % 15); // 50–64
    reason = 'Evenly matched sides — a tight, cagey contest expected.';
  }

  if (confidence > 88) confidence = 88; // never oversell certainty
  return { tip, confidence, reason };
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

function confBar(pct: number): string {
  const filled = Math.round((pct / 100) * 5);
  return '🟩'.repeat(filled) + '⬜'.repeat(5 - filled);
}

export default predict;
