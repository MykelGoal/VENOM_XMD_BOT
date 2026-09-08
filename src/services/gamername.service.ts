/**
 * Stylish gamer-name generator for .ffname / .ign.
 * Fully self-contained — turns plain text into fancy Unicode fonts + decorated
 * "pro" name variants (brackets, symbols, guild-tag style). No external API.
 */

/** Unicode font maps. Each maps a-z / A-Z / 0-9 where the style supports it. */
const FONTS: Record<string, (c: string) => string> = {};

function buildMap(
  name: string,
  upper: string,
  lower: string,
  digits?: string,
): void {
  FONTS[name] = (c: string) => {
    const code = c.charCodeAt(0);
    if (c >= 'A' && c <= 'Z') return sliceChar(upper, code - 65) ?? c;
    if (c >= 'a' && c <= 'z') return sliceChar(lower, code - 97) ?? c;
    if (digits && c >= '0' && c <= '9') return sliceChar(digits, code - 48) ?? c;
    return c;
  };
}

/** Grab the n-th visual character from a string of (possibly multi-code) glyphs. */
function sliceChar(seq: string, n: number): string | undefined {
  const arr = Array.from(seq);
  return arr[n];
}

// ── Font definitions (Array.from-safe, astral glyphs allowed) ──
buildMap(
  'Bold',
  '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
  '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
  '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
);
buildMap(
  'Italic',
  '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡',
  '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
);
buildMap(
  'Gothic',
  '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
  '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
);
buildMap(
  'Double',
  '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',
  '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
  '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡',
);
buildMap(
  'Circled',
  'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
  'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
  '⓪①②③④⑤⑥⑦⑧⑨',
);
buildMap(
  'Square',
  '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
  '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
);
buildMap(
  'Fullwidth',
  'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ',
  'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ',
  '０１２３４５６７８９',
);
buildMap(
  'Small',
  'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ',
  'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘqʀꜱᴛᴜᴠᴡxʏᴢ',
);

function applyFont(name: string, text: string): string {
  const fn = FONTS[name];
  if (!fn) return text;
  return Array.from(text).map(fn).join('');
}

/** Decorative "pro gamer" wrappers around the (optionally fancy) name. */
function proVariants(name: string): string[] {
  const b = applyFont('Bold', name);
  const clean = name;
  return [
    `꧁༒${b}༒꧂`,
    `▁ ▂ ▄ ${b} ▄ ▂ ▁`,
    `☆°•${b}•°☆`,
    `【 ${b} 】`,
    `»»————${clean}————««`,
    `✿°•${b}•°✿`,
    `╰☆☆ ${b} ☆☆╮`,
    `▄︻┻═┳一 ${b}`,
    `𝕏 ${b} 𝕏`,
    `ঔৣ☬✞${b}✞☬ঔৣ`,
    `⎝⎝ ${b} ⎠⎠`,
    `⚡ ${b} ⚡`,
  ];
}

/** Guild/clan-tag style short prefixes applied to the name. */
function tagVariants(name: string): string[] {
  const b = applyFont('Bold', name);
  const tags = ['乂', 'ⓋⓋ', 'ᴹᴿ', '꧁', 'ঔৣ', '★', 'ᴳᵒᵈ', 'ꜰꜰ'];
  return tags.slice(0, 5).map((t) => `${t}࿐ ${b}`);
}

export interface NameResult {
  input: string;
  fonts: { style: string; text: string }[];
  pro: string[];
  tags: string[];
}

export function styleName(input: string): NameResult {
  const text = input.trim();
  const fontStyles = Object.keys(FONTS);
  return {
    input: text,
    fonts: fontStyles.map((style) => ({ style, text: applyFont(style, text) })),
    pro: proVariants(text),
    tags: tagVariants(text),
  };
}

/** Format the full result into a WhatsApp message. */
export function formatNames(r: NameResult): string {
  const lines: string[] = [
    `🎮 *Pro Gamer Names for* "${r.input}"`,
    '',
    '✨ *Fancy Fonts:*',
    ...r.fonts.map((f) => `• ${f.text}`),
    '',
    '🔥 *Pro / Stylish:*',
    ...r.pro.map((p) => `• ${p}`),
    '',
    '🏰 *Clan-Tag Style:*',
    ...r.tags.map((t) => `• ${t}`),
    '',
    '_Long-press to copy the one you like. 🕷️_',
    '_Tip: some styles need a font-supporting keyboard in-game._',
  ];
  return lines.join('\n');
}
