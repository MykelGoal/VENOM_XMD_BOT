/**
 * Convert common Markdown (what LLMs love to output) into WhatsApp-native
 * formatting, so replies don't show ugly literal asterisks, hashes, etc.
 *
 * WhatsApp formatting reference:
 *   *bold*        (single asterisk)
 *   _italic_      (single underscore)
 *   ~strike~      (single tilde)
 *   ```mono```    (code block — kept as-is)
 *
 * Markdown differences we normalise:
 *   **bold**  / __bold__      → *bold*
 *   ### Heading               → *Heading*
 *   - item / * item           → • item
 *   [text](url)               → text (url)
 *   Excess blank lines        → collapsed
 */
export function toWhatsApp(input: string): string {
  if (!input) return input;

  let out = input;

  // Protect fenced code blocks so we don't mangle their contents.
  const codeBlocks: string[] = [];
  out = out.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m);
    return `\u0000CODE${codeBlocks.length - 1}\u0000`;
  });

  // Protect inline `code` spans too.
  const inlineCode: string[] = [];
  out = out.replace(/`[^`\n]+`/g, (m) => {
    inlineCode.push(m);
    return `\u0001CODE${inlineCode.length - 1}\u0001`;
  });

  // Headings (#, ##, ### …) → bold line.
  out = out.replace(/^\s{0,3}#{1,6}\s+(.*)$/gm, (_m, t) => `*${t.trim()}*`);

  // Bold: **text** or __text__ → *text*
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '*$1*');
  out = out.replace(/__([^_\n]+)__/g, '*$1*');

  // Italic: single *text* is already WA italic-ish, but Markdown uses *…* for
  // italic and _…_ for italic. Leave _italic_ as-is (valid on WA). Convert
  // Markdown *italic* is ambiguous with WA bold — skip to avoid breaking bold.

  // Bullets: leading "- " or "* " or "+ " → "• "
  out = out.replace(/^(\s*)[-*+]\s+/gm, '$1• ');

  // Numbered lists: keep as "1. " (WhatsApp shows these fine) — no change.

  // Links [text](url) → text (url); bare [text](url) with same text → url.
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, t, u) =>
    t === u ? u : `${t} (${u})`,
  );

  // Blockquotes "> " → nothing special on WA; strip the marker.
  out = out.replace(/^\s{0,3}>\s?/gm, '');

  // Horizontal rules (--- *** ___) → drop.
  out = out.replace(/^\s*([-*_])\1{2,}\s*$/gm, '');

  // Collapse 3+ newlines to a max of 2 (tidy spacing).
  out = out.replace(/\n{3,}/g, '\n\n');

  // Trim trailing spaces on each line.
  out = out.replace(/[ \t]+$/gm, '');

  // Restore inline code and code blocks.
  out = out.replace(/\u0001CODE(\d+)\u0001/g, (_m, i) => inlineCode[Number(i)]);
  out = out.replace(/\u0000CODE(\d+)\u0000/g, (_m, i) => codeBlocks[Number(i)]);

  return out.trim();
}
