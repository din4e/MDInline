/**
 * Import converters: turn an uploaded file's raw bytes into a Markdown string
 * for the editor. Loaded lazily from useDocActions so turndown (~25 KB gzip) and
 * — for .docx only — mammoth stay out of the initial bundle.
 *
 * Format dispatch is by file extension, with content sniffing for .doc (which
 * may be Word-HTML text or a binary OLE compound file) and unknown extensions.
 * Binary .doc is best-effort plain-text extraction (no formatting) — the user
 * accepted that trade-off; Word-HTML .doc round-trips with full formatting.
 */
import TurndownService from "turndown";
import * as turndownPluginGfm from "turndown-plugin-gfm";

// One shared instance; creating per import is wasteful and re-registers plugins.
const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
});
td.use(turndownPluginGfm.gfm); // tables, strikethrough, task list items

/** HTML → Markdown. Strips <style>/<script> noise first; turndown ignores
 *  inline style="" attrs, so even our fully-inlined export HTML cleans up. */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("style,script").forEach((n) => n.remove());
  const root = doc.body || doc.documentElement;
  return td.turndown(root).trim();
}

const utf8Decoder = new TextDecoder("utf-8", { fatal: false });
const utf16leDecoder = new TextDecoder("utf-16le", { fatal: false });
const latin1Decoder = new TextDecoder("latin1", { fatal: false });

function decodeUtf8(bytes: Uint8Array): string {
  return utf8Decoder.decode(bytes); // strips a leading BOM by default
}

/** OLE compound files (real binary .doc, .xls, …) start with these 8 bytes. */
function isOleCompound(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  );
}

/** Heuristic: does this text look like HTML (incl. Word's HTML-flavored .doc)? */
function looksLikeHtml(text: string): boolean {
  const head = text.slice(0, 1000).trimStart();
  if (/^<(?:html|!doctype|\?xml|head|body|meta|div|p|h[1-6]|table)\b/i.test(head)) return true;
  return /<w:WordDocument|<html\b|<\/(?:html|body|div|p|table)>/i.test(text);
}

/**
 * Best-effort plain-text extraction from a binary .doc (OLE compound). Word
 * stores body text as UTF-16LE inside the WordDocument stream, interleaved with
 * binary structure; we decode the whole buffer several ways, keep maximal runs
 * of text-like characters, and return whichever decoding scores richest in real
 * letters/CJK. Result is unformatted text — acceptable per the agreed scope.
 */
function extractBinaryDocText(bytes: Uint8Array): string {
  // Cap to avoid pathological files stalling the decoder/regex.
  const view = bytes.length > 4_000_000 ? bytes.subarray(0, 4_000_000) : bytes;
  const candidates = [
    scanText(utf16leDecoder.decode(view)),
    scanText(utf8Decoder.decode(view)),
    scanText(latin1Decoder.decode(view)),
  ];
  let best = "";
  let bestScore = -1;
  for (const c of candidates) {
    const s = scoreText(c);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

/** Keep maximal runs of text-like chars; split on noise gaps; drop short/junk. */
function scanText(decoded: string): string {
  const cleaned = decoded
    .replace(/[^\p{L}\p{N}\p{P}\s]/gu, " ") // non-text bytes → space
    .replace(/(.)\1{3,}/gu, " "); // collapse any 4+ identical chars (binary padding decodes to runs like "āāāā") → space
  return cleaned
    .split(/\s{2,}|[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && /[\p{L}\p{N}]/u.test(s) && !isRepeatedNoise(s))
    .join("\n\n");
}

/** Reject chunks dominated by a single repeating char — binary padding (e.g. a
 *  run of 0x01 bytes) decodes as the same letter over and over ("āāāā…") and is
 *  not real text. Only checked for chunks ≥ 6 chars so short words are safe. */
function isRepeatedNoise(s: string): boolean {
  const noSpace = s.replace(/\s/g, "");
  if (noSpace.length < 6) return false;
  const counts = new Map<string, number>();
  for (const ch of noSpace) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let max = 0;
  for (const n of counts.values()) if (n > max) max = n;
  return max > noSpace.length * 0.5;
}

/** Score by CJK (weighted) + ASCII letters — richer = more likely real text. */
function scoreText(s: string): number {
  let cjk = 0;
  let ascii = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (
      (c >= 0x4e00 && c <= 0x9fff) ||
      (c >= 0x3000 && c <= 0x30ff) ||
      (c >= 0xff00 && c <= 0xffef)
    )
      cjk++;
    else if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) ascii++;
  }
  return cjk * 2 + ascii;
}

/** Entry point: dispatch by extension, sniff where ambiguous. */
export async function fileToMarkdown(name: string, bytes: Uint8Array): Promise<string> {
  const ext = (name.toLowerCase().split(".").pop() ?? "").trim();

  if (ext === "md" || ext === "markdown" || ext === "txt") return decodeUtf8(bytes);
  if (ext === "htm" || ext === "html") return htmlToMarkdown(decodeUtf8(bytes));

  if (ext === "docx") {
    const { extractDocxHtml } = await import("./docx");
    return htmlToMarkdown(await extractDocxHtml(bytes));
  }

  if (ext === "doc") {
    if (isOleCompound(bytes)) return extractBinaryDocText(bytes);
    const text = decodeUtf8(bytes);
    return looksLikeHtml(text) ? htmlToMarkdown(text) : extractBinaryDocText(bytes);
  }

  // Unknown extension: sniff content.
  if (isOleCompound(bytes)) throw new Error("无法识别的二进制文档,请另存为 .docx 后再导入");
  const text = decodeUtf8(bytes);
  return looksLikeHtml(text) ? htmlToMarkdown(text) : text;
}
