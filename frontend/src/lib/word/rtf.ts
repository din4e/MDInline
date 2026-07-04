/**
 * RTF emitter (zero dependencies). IR -> RTF string.
 *
 * Designed to paste into Word/WPS with fonts, colors, code highlighting,
 * tables, lists, blockquotes, and headings intact. Lists use literal markers
 * (robust across WPS); hyperlinks are emitted as styled text only (the RTF
 * HYPERLINK field renders inconsistently in WPS).
 */
import type { Doc, Paragraph, Run, Table } from "./ir";

// Unit conversions.
const pxToTwip = (px: number) => Math.round(px * 15); // 96 dpi -> 1440 twips/inch
const pxToHalfPt = (px: number) => Math.round(px * 2); // RTF \fs is half-points

const ALIGN_CTL: Record<string, string> = {
  left: "\\ql",
  center: "\\qc",
  right: "\\qr",
  justify: "\\qj",
};

export function docToRtf(doc: Doc): string {
  const ctx = makeTables(doc);
  const body = doc.blocks.map((b) => emitBlock(b, ctx)).join("\n");
  const fonttbl = ctx.fonts.map((f, i) => `{\\f${i} ${escapeRtfText(f)};}`).join("");
  const colortbl = ";" + ctx.colors.map((c) => `\\red${hex(c, 0)}\\green${hex(c, 1)}\\blue${hex(c, 2)};`).join("");
  const head = `{\\rtf1\\ansi\\ansicpg936\\deff0{\\fonttbl${fonttbl}}{\\colortbl${colortbl}}\\viewkind4\\uc1\\pard\\f0\\fs24 `;
  return head + body + "}";
}

interface EmitCtx {
  fonts: string[];
  fontIdx: Map<string, number>;
  colors: string[];
  colorIdx: Map<string, number>;
  fontOf: (f?: string) => number;
  colorOf: (c?: string) => number;
}

function makeTables(doc: Doc): EmitCtx {
  const fonts: string[] = [];
  const fontIdx = new Map<string, number>();
  const colors: string[] = [];
  const colorIdx = new Map<string, number>();
  const register = (el: Element | undefined, r?: Run, cellBg?: string) => {
    if (r) {
      if (r.fontFamily && !fontIdx.has(r.fontFamily)) {
        fontIdx.set(r.fontFamily, fonts.length);
        fonts.push(r.fontFamily);
      }
      for (const c of [r.color, r.highlight]) {
        if (c && !colorIdx.has(c)) {
          colorIdx.set(c, colors.length);
          colors.push(c);
        }
      }
    }
    if (cellBg && !colorIdx.has(cellBg)) {
      colorIdx.set(cellBg, colors.length);
      colors.push(cellBg);
    }
  };
  for (const b of doc.blocks) {
    if (b.type === "paragraph") for (const r of b.data.runs) register(undefined, r);
    else if (b.type === "table")
      for (const row of b.data.rows) for (const c of row.cells) for (const r of c.runs) register(undefined, r, c.bg);
  }
  return {
    fonts,
    fontIdx,
    colors,
    colorIdx,
    fontOf: (f?: string) => (f ? fontIdx.get(f) ?? -1 : -1),
    colorOf: (c?: string) => (c ? colorIdx.get(c) ?? -1 : -1),
  };
}

function emitBlock(block: Doc["blocks"][number], ctx: EmitCtx): string {
  if (block.type === "table") return emitTable(block.data, ctx);
  if (block.type === "image") {
    return emitParagraph({ kind: "p", runs: [{ text: `[${block.data.alt || "图片"}]`, italic: true }] }, ctx);
  }
  return emitParagraph(block.data, ctx);
}

function emitParagraph(p: Paragraph, ctx: EmitCtx): string {
  if (p.kind === "hr") {
    return "{\\pard\\brdrb\\brdrs\\brdrw15\\brsp20\\par}";
  }
  let out = "{\\pard";
  if (p.align) out += ALIGN_CTL[p.align];

  // Spacing.
  if (p.marginTopPx != null) out += `\\sb${pxToTwip(p.marginTopPx)}`;
  if (p.marginBottomPx != null) out += `\\sa${pxToTwip(p.marginBottomPx)}`;
  if (p.lineHeight) out += `\\sl${Math.round(p.lineHeight * 240)}\\slmult1`;
  if (p.kind === "pre") out += "\\sb120\\sa120\\li240";

  // List / quote decoration.
  if (p.list) out += `\\li${(p.list.level + 1) * 360} `;
  else if (p.quote) {
    const li = p.quote.paddingLeftPx != null ? pxToTwip(p.quote.paddingLeftPx) : 360;
    out += `\\li${li} `;
    if (p.quote.borderColor) {
      out += `\\brdrl\\brdrs\\brdrw20\\brsp10\\brdrcf${ctx.colorOf(p.quote.borderColor) + 1}`;
    }
    if (p.quote.bg) out += `\\cbpat${ctx.colorOf(p.quote.bg) + 1}`;
  }

  // List marker prefix (literal, robust across WPS) — emitted as a styled run
  // so it matches the paragraph font/size. escapeRtfText encodes the bullet.
  if (p.list && p.runs.length) {
    const base = p.runs[0];
    out += emitRun(
      {
        text: p.list.type === "bullet" ? "•  " : `${p.list.number ?? 1}.  `,
        color: base.color,
        fontFamily: base.fontFamily,
        fontSizePx: base.fontSizePx,
      },
      ctx
    );
  }

  for (const r of p.runs) out += emitRun(r, ctx);
  out += "\\par}";
  return out;
}

function emitRun(r: Run, ctx: EmitCtx): string {
  let s = "{";
  if (r.color && ctx.colorOf(r.color) >= 0) s += `\\cf${ctx.colorOf(r.color) + 1}`;
  if (r.highlight && ctx.colorOf(r.highlight) >= 0) s += `\\highlight${ctx.colorOf(r.highlight) + 1}`;
  if (r.bold) s += "\\b";
  if (r.italic) s += "\\i";
  if (r.strike) s += "\\strike";
  if (r.underline) s += "\\ul";
  if (r.fontSizePx) s += `\\fs${pxToHalfPt(r.fontSizePx)}`;
  if (r.fontFamily && ctx.fontOf(r.fontFamily) >= 0) s += `\\f${ctx.fontOf(r.fontFamily)}`;
  s += " " + escapeRtfText(r.text);
  s += "}";
  return s;
}

function emitTable(table: Table, ctx: EmitCtx): string {
  const cols = Math.max(...table.rows.map((r) => r.cells.length), 1);
  const cellW = Math.floor(9000 / cols);
  let out = "";
  for (const row of table.rows) {
    out += "\\trowd\\trgaph108\\trleft0";
    for (let i = 0; i < cols; i++) {
      out += `\\clbrdrt\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10\\cellx${cellW * (i + 1)}`;
    }
    for (const cell of row.cells) {
      out += "{\\intbl";
      if (cell.isHeader) out += "\\b";
      for (const r of cell.runs) out += emitRun(r, ctx);
      out += "\\cell}";
    }
    out += "\\row";
  }
  return out;
}

// --- escaping --------------------------------------------------------------

function escapeRtfText(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (ch === "\\") out += "\\\\";
    else if (ch === "{") out += "\\{";
    else if (ch === "}") out += "\\}";
    else if (ch === "\n") out += "\\line ";
    else if (code > 0xffff) {
      const v = code - 0x10000;
      const hi = 0xd800 + (v >> 10);
      const lo = 0xdc00 + (v & 0x3ff);
      out += `\\u${toSigned16(hi)}?\\u${toSigned16(lo)}?`;
    } else if (code > 127) {
      out += `\\u${toSigned16(code)}?`;
    } else {
      out += ch;
    }
  }
  return out;
}

function toSigned16(code: number): number {
  return code > 0x7fff ? code - 0x10000 : code;
}

/** Channel 0/1/2 = R/G/B from a "#RRGGBB" string -> decimal. */
function hex(color: string, channel: number): number {
  return parseInt(color.slice(1 + channel * 2, 3 + channel * 2), 16);
}
