/**
 * Free Fire sensitivity engine.
 *
 * Goal: `.sensi <phone>` returns sensitivity that feels made FOR that device,
 * never generic. Two layers:
 *   1) CURATED — hand-tuned, community-proven values for popular phones
 *      (heavy on brands big in Nigeria/Africa: Tecno, Infinix, Samsung,
 *      iPhone, Redmi, itel, etc.).
 *   2) SMART — if a phone isn't in the curated list, we infer its tier from
 *      the brand/model name (RAM class, refresh rate, chipset era) and tune
 *      values to THAT tier. Free Fire scales sensitivity 0–200.
 *
 * Fully self-contained — no external device API (those are unreliable), so the
 * command always answers.
 */

export interface Sensi {
  general: number;
  redDot: number;
  scope2x: number;
  scope4x: number;
  sniper: number;
  freeLook: number;
  dpi: number;
  fireButton: number;
}

export interface SensiResult {
  phone: string;      // normalized display name
  source: 'curated' | 'smart';
  tier: string;       // e.g. "Low-end", "Mid-range", "Flagship"
  refresh: number;    // assumed refresh rate (Hz)
  sensi: Sensi;
  note: string;       // one-line tuning explanation
}

const clamp = (n: number, lo = 0, hi = 200) => Math.max(lo, Math.min(hi, Math.round(n)));

/** ── CURATED DB ─────────────────────────────────────────────────
 * Keys are lowercase, spaces collapsed. Proven community-style values.
 */
const CURATED: Record<string, Partial<Sensi> & { tier?: string; refresh?: number }> = {
  // ── Tecno ──
  'tecno spark go': { general: 190, redDot: 170, scope2x: 150, scope4x: 130, sniper: 95, freeLook: 130, dpi: 400, fireButton: 65, tier: 'Entry-level', refresh: 60 },
  'tecno spark 10': { general: 185, redDot: 165, scope2x: 148, scope4x: 128, sniper: 92, freeLook: 128, dpi: 420, fireButton: 62, tier: 'Budget', refresh: 90 },
  'tecno camon 20': { general: 175, redDot: 158, scope2x: 140, scope4x: 118, sniper: 88, freeLook: 120, dpi: 450, fireButton: 60, tier: 'Mid-range', refresh: 120 },
  'tecno pova 5': { general: 170, redDot: 152, scope2x: 135, scope4x: 115, sniper: 85, freeLook: 118, dpi: 460, fireButton: 58, tier: 'Mid-range', refresh: 120 },
  'tecno phantom': { general: 160, redDot: 145, scope2x: 128, scope4x: 108, sniper: 80, freeLook: 110, dpi: 480, fireButton: 55, tier: 'Premium', refresh: 120 },
  // ── Infinix ──
  'infinix hot': { general: 188, redDot: 168, scope2x: 148, scope4x: 128, sniper: 94, freeLook: 128, dpi: 410, fireButton: 63, tier: 'Budget', refresh: 90 },
  'infinix note': { general: 172, redDot: 155, scope2x: 138, scope4x: 116, sniper: 86, freeLook: 118, dpi: 455, fireButton: 58, tier: 'Mid-range', refresh: 120 },
  'infinix zero': { general: 162, redDot: 146, scope2x: 130, scope4x: 110, sniper: 82, freeLook: 112, dpi: 475, fireButton: 55, tier: 'Premium', refresh: 120 },
  'infinix gt': { general: 158, redDot: 142, scope2x: 126, scope4x: 106, sniper: 78, freeLook: 108, dpi: 485, fireButton: 52, tier: 'Gaming', refresh: 120 },
  // ── itel ──
  'itel': { general: 195, redDot: 175, scope2x: 155, scope4x: 135, sniper: 98, freeLook: 135, dpi: 390, fireButton: 66, tier: 'Entry-level', refresh: 60 },
  // ── Samsung ──
  'samsung galaxy a0': { general: 190, redDot: 170, scope2x: 150, scope4x: 130, sniper: 95, freeLook: 130, dpi: 400, fireButton: 64, tier: 'Entry-level', refresh: 60 },
  'samsung galaxy a1': { general: 182, redDot: 163, scope2x: 145, scope4x: 125, sniper: 90, freeLook: 125, dpi: 420, fireButton: 61, tier: 'Budget', refresh: 90 },
  'samsung galaxy a2': { general: 172, redDot: 155, scope2x: 138, scope4x: 116, sniper: 86, freeLook: 118, dpi: 450, fireButton: 58, tier: 'Mid-range', refresh: 90 },
  'samsung galaxy a3': { general: 168, redDot: 150, scope2x: 133, scope4x: 113, sniper: 84, freeLook: 115, dpi: 460, fireButton: 56, tier: 'Mid-range', refresh: 120 },
  'samsung galaxy a5': { general: 165, redDot: 148, scope2x: 130, scope4x: 110, sniper: 82, freeLook: 112, dpi: 470, fireButton: 55, tier: 'Upper-mid', refresh: 120 },
  'samsung galaxy s2': { general: 150, redDot: 135, scope2x: 120, scope4x: 100, sniper: 75, freeLook: 105, dpi: 500, fireButton: 50, tier: 'Flagship', refresh: 120 },
  'samsung galaxy s2 ultra': { general: 145, redDot: 130, scope2x: 115, scope4x: 96, sniper: 72, freeLook: 100, dpi: 515, fireButton: 48, tier: 'Flagship', refresh: 120 },
  // ── Redmi / Xiaomi / Poco ──
  'redmi a': { general: 192, redDot: 172, scope2x: 152, scope4x: 132, sniper: 96, freeLook: 132, dpi: 395, fireButton: 65, tier: 'Entry-level', refresh: 60 },
  'redmi 9': { general: 185, redDot: 166, scope2x: 147, scope4x: 127, sniper: 92, freeLook: 127, dpi: 415, fireButton: 62, tier: 'Budget', refresh: 60 },
  'redmi 10': { general: 180, redDot: 162, scope2x: 143, scope4x: 123, sniper: 90, freeLook: 123, dpi: 430, fireButton: 60, tier: 'Budget', refresh: 90 },
  'redmi 12': { general: 174, redDot: 156, scope2x: 139, scope4x: 117, sniper: 87, freeLook: 119, dpi: 450, fireButton: 58, tier: 'Mid-range', refresh: 90 },
  'redmi note': { general: 168, redDot: 151, scope2x: 134, scope4x: 113, sniper: 84, freeLook: 115, dpi: 465, fireButton: 56, tier: 'Mid-range', refresh: 120 },
  'poco x': { general: 158, redDot: 142, scope2x: 126, scope4x: 106, sniper: 79, freeLook: 108, dpi: 485, fireButton: 53, tier: 'Gaming', refresh: 120 },
  'poco f': { general: 150, redDot: 135, scope2x: 120, scope4x: 100, sniper: 75, freeLook: 104, dpi: 500, fireButton: 50, tier: 'Flagship', refresh: 120 },
  // ── iPhone ──
  'iphone 6': { general: 185, redDot: 166, scope2x: 147, scope4x: 127, sniper: 92, freeLook: 127, dpi: 400, fireButton: 62, tier: 'Old', refresh: 60 },
  'iphone 7': { general: 178, redDot: 160, scope2x: 142, scope4x: 120, sniper: 89, freeLook: 122, dpi: 420, fireButton: 60, tier: 'Old', refresh: 60 },
  'iphone 8': { general: 172, redDot: 155, scope2x: 138, scope4x: 116, sniper: 86, freeLook: 118, dpi: 440, fireButton: 58, tier: 'Mid', refresh: 60 },
  'iphone x': { general: 165, redDot: 148, scope2x: 131, scope4x: 111, sniper: 83, freeLook: 113, dpi: 460, fireButton: 55, tier: 'Premium', refresh: 60 },
  'iphone 11': { general: 160, redDot: 144, scope2x: 128, scope4x: 108, sniper: 80, freeLook: 110, dpi: 470, fireButton: 53, tier: 'Premium', refresh: 60 },
  'iphone 12': { general: 155, redDot: 140, scope2x: 124, scope4x: 104, sniper: 78, freeLook: 107, dpi: 480, fireButton: 52, tier: 'Premium', refresh: 60 },
  'iphone 13': { general: 152, redDot: 137, scope2x: 121, scope4x: 101, sniper: 76, freeLook: 105, dpi: 490, fireButton: 51, tier: 'Flagship', refresh: 60 },
  'iphone 14': { general: 148, redDot: 133, scope2x: 118, scope4x: 98, sniper: 74, freeLook: 102, dpi: 500, fireButton: 50, tier: 'Flagship', refresh: 60 },
  'iphone 15': { general: 145, redDot: 130, scope2x: 115, scope4x: 96, sniper: 72, freeLook: 100, dpi: 510, fireButton: 48, tier: 'Flagship', refresh: 60 },
  'iphone 15 pro': { general: 140, redDot: 126, scope2x: 112, scope4x: 93, sniper: 70, freeLook: 97, dpi: 525, fireButton: 46, tier: 'Flagship 120Hz', refresh: 120 },
};

/** Base sensi profile per tier (used by the smart generator). */
const TIER_BASE: Record<string, Sensi & { refresh: number }> = {
  entry:   { general: 192, redDot: 172, scope2x: 152, scope4x: 132, sniper: 96, freeLook: 132, dpi: 400, fireButton: 64, refresh: 60 },
  budget:  { general: 184, redDot: 165, scope2x: 146, scope4x: 126, sniper: 91, freeLook: 126, dpi: 420, fireButton: 61, refresh: 90 },
  mid:     { general: 172, redDot: 155, scope2x: 138, scope4x: 116, sniper: 86, freeLook: 118, dpi: 455, fireButton: 58, refresh: 120 },
  upper:   { general: 162, redDot: 146, scope2x: 130, scope4x: 110, sniper: 82, freeLook: 112, dpi: 475, fireButton: 54, refresh: 120 },
  flagship:{ general: 150, redDot: 135, scope2x: 120, scope4x: 100, sniper: 75, freeLook: 104, dpi: 500, fireButton: 50, refresh: 120 },
};

const TIER_LABEL: Record<string, string> = {
  entry: 'Entry-level', budget: 'Budget', mid: 'Mid-range',
  upper: 'Upper-mid', flagship: 'Flagship',
};

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Infer a tier from the brand/model name when not in the curated DB. */
function inferTier(q: string): keyof typeof TIER_BASE {
  const s = norm(q);
  // Flagship signals
  if (/\b(ultra|pro max|s2[0-9]|s3[0-9]|iphone 1[3-9]|iphone 1[3-9] pro|poco f|rog|red magic|oneplus \d{1,2} pro|find x|mi 1[0-9]|galaxy z)\b/.test(s))
    return 'flagship';
  // Upper-mid / gaming
  if (/\b(gt|poco x|nord|reno|galaxy a[5-9]\d|note 1[2-9] pro|infinix zero|iphone 1[12])\b/.test(s))
    return 'upper';
  // Mid-range
  if (/\b(camon|pova|redmi note|infinix note|galaxy a[2-4]\d|note \d|iphone [89]|iphone x|realme \d)\b/.test(s))
    return 'mid';
  // Entry-level
  if (/\b(itel|a0[0-9]|spark go|hot \d{1,2} play|redmi a\d|go 20|galaxy a0)\b/.test(s))
    return 'entry';
  // Budget default for spark/hot/redmi/samsung a1x
  if (/\b(spark|hot|redmi|galaxy a1|infinix smart|tecno pop)\b/.test(s))
    return 'budget';
  // Unknown → assume mid-range (safest, most common)
  return 'mid';
}

/** Deterministic tiny per-model variation so two phones in a tier differ a bit. */
function hashJitter(q: string): number {
  let h = 0;
  for (let i = 0; i < q.length; i++) h = (h * 31 + q.charCodeAt(i)) & 0xffff;
  return (h % 7) - 3; // -3..+3
}

/** Main entry: get the best sensitivity for a phone name. */
export function getSensi(rawQuery: string): SensiResult | null {
  const query = rawQuery.trim();
  if (!query) return null;
  const n = norm(query);

  // 1) Curated — longest matching key wins (so "iphone 15 pro" beats "iphone 15")
  let bestKey = '';
  for (const key of Object.keys(CURATED)) {
    if (n.includes(key) && key.length > bestKey.length) bestKey = key;
  }
  if (bestKey) {
    const c = CURATED[bestKey];
    const base = TIER_BASE[inferTier(bestKey)];
    const sensi: Sensi = {
      general: c.general ?? base.general,
      redDot: c.redDot ?? base.redDot,
      scope2x: c.scope2x ?? base.scope2x,
      scope4x: c.scope4x ?? base.scope4x,
      sniper: c.sniper ?? base.sniper,
      freeLook: c.freeLook ?? base.freeLook,
      dpi: c.dpi ?? base.dpi,
      fireButton: c.fireButton ?? base.fireButton,
    };
    return {
      phone: titleCase(query),
      source: 'curated',
      tier: c.tier ?? TIER_LABEL[inferTier(bestKey)],
      refresh: c.refresh ?? base.refresh,
      sensi,
      note: `Hand-tuned, community-proven values for the ${titleCase(bestKey)} family.`,
    };
  }

  // 2) Smart — infer tier and tune
  const tier = inferTier(query);
  const base = TIER_BASE[tier];
  const j = hashJitter(n);
  const sensi: Sensi = {
    general: clamp(base.general + j),
    redDot: clamp(base.redDot + j),
    scope2x: clamp(base.scope2x + j),
    scope4x: clamp(base.scope4x + Math.round(j / 2)),
    sniper: clamp(base.sniper + Math.round(j / 2), 40, 120),
    freeLook: clamp(base.freeLook + j),
    dpi: base.dpi,
    fireButton: clamp(base.fireButton + Math.round(j / 2), 40, 90),
  };
  return {
    phone: titleCase(query),
    source: 'smart',
    tier: TIER_LABEL[tier],
    refresh: base.refresh,
    sensi,
    note:
      tier === 'flagship' || tier === 'upper'
        ? `Tuned for a high-performance ${TIER_LABEL[tier].toLowerCase()} device — lower sensi for precision on a fast, high-refresh screen.`
        : `Tuned for a ${TIER_LABEL[tier].toLowerCase()} device — higher sensi to keep aim fast and responsive.`,
  };
}

function titleCase(s: string): string {
  return s
    .split(' ')
    .map((w) => (/^\d/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Format a result into a WhatsApp-ready message. */
export function formatSensi(r: SensiResult): string {
  const s = r.sensi;
  return [
    `🎯 *Best Free Fire Sensitivity*`,
    `📱 *${r.phone}*  ·  ${r.tier} · ${r.refresh}Hz`,
    '',
    `👆 General:        *${s.general}*`,
    `🔴 Red Dot:        *${s.redDot}*`,
    `🔭 2x Scope:       *${s.scope2x}*`,
    `🔭 4x Scope:       *${s.scope4x}*`,
    `🎯 Sniper Scope:   *${s.sniper}*`,
    `👀 Free Look:      *${s.freeLook}*`,
    '',
    `🔥 Fire Button size: *${s.fireButton}*`,
    `⚙️ Recommended DPI:  *${s.dpi}*`,
    '',
    `_${r.note}_`,
    r.source === 'smart'
      ? `_ℹ️ Auto-tuned to your device's tier. Fine-tune ±10 to taste._`
      : `_✅ Proven values — tweak ±10 to match your grip._`,
    '',
    `🕷️ VENOM-XMD · type *.sensi <your phone>*`,
  ].join('\n');
}
