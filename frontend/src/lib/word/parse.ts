/**
 * Build the IR (`Doc`) from the already-style-inlined HTML.
 *
 * Uses DOMParser + each element's `el.style` (CSSStyleDeclaration) — no
 * hand-written CSS parsing. Style inheritance is resolved by walking the DOM
 * and only overriding a run property when an element actually sets it (e.g.
 * `<strong style="font-weight:700">` keeps the paragraph's `color`).
 */
import type {
  Align,
  Block,
  Doc,
  ListInfo,
  Paragraph,
  ParagraphKind,
  QuoteInfo,
  Run,
  Table,
  TableCell,
} from "./ir";

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const BLOCK_TAGS = new Set([
  "p",
  "ul",
  "ol",
  "blockquote",
  "pre",
  "table",
  "hr",
  "div",
  ...HEADING_TAGS,
]);

export function parseInlinedHtml(html: string): Doc {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.body.firstElementChild as HTMLElement | null;
  const blocks: Block[] = [];
  if (root) walkBlockChildren(root, blocks, {});
  return { blocks };
}

interface Ctx {
  list?: ListInfo;
  quote?: QuoteInfo;
}

function walkBlockChildren(parent: Element, blocks: Block[], ctx: Ctx): void {
  for (const child of Array.from(parent.children)) dispatchBlock(child, blocks, ctx);
}

function dispatchBlock(el: Element, blocks: Block[], ctx: Ctx): void {
  const tag = el.tagName.toLowerCase();
  if (tag === "hr") {
    blocks.push({ type: "paragraph", data: { kind: "hr", runs: [], ...ctxList(ctx), ...ctxQuote(ctx) } });
    return;
  }
  if (HEADING_TAGS.has(tag)) {
    blocks.push({ type: "paragraph", data: makeParagraph(el, tag as ParagraphKind, ctx) });
    return;
  }
  if (tag === "p") {
    blocks.push({ type: "paragraph", data: makeParagraph(el, "p", ctx) });
    return;
  }
  if (tag === "pre") {
    blocks.push({ type: "paragraph", data: makePre(el as HTMLElement, ctx) });
    return;
  }
  if (tag === "blockquote") {
    const inner = readQuote(el as HTMLElement);
    walkBlockChildren(el, blocks, { ...ctx, quote: inner ?? ctx.quote });
    return;
  }
  if (tag === "ul" || tag === "ol") {
    const level = (ctx.list?.level ?? -1) + 1;
    walkList(el, blocks, { ...ctx, list: { type: tag === "ul" ? "bullet" : "ordered", level } });
    return;
  }
  if (tag === "table") {
    blocks.push({ type: "table", data: makeTable(el) });
    return;
  }
  if (tag === "img") {
    blocks.push({ type: "image", data: { src: el.getAttribute("src") ?? "", alt: el.getAttribute("alt") ?? undefined } });
    return;
  }
  // Unknown block container: descend.
  if (el.children.length) walkBlockChildren(el, blocks, ctx);
  else blocks.push({ type: "paragraph", data: makeParagraph(el, "p", ctx) });
}

/** ctx.list lifted into a Paragraph slice (for object spread). */
function ctxList(ctx: Ctx): { list?: Paragraph["list"] } {
  return ctx.list ? { list: ctx.list } : {};
}
function ctxQuote(ctx: Ctx): { quote?: QuoteInfo } {
  return ctx.quote ? { quote: ctx.quote } : {};
}

function walkList(listEl: Element, blocks: Block[], ctx: Ctx): void {
  let ordered = 0;
  for (const li of Array.from(listEl.children)) {
    if (li.tagName.toLowerCase() !== "li") continue;
    if (ctx.list?.type === "ordered") ordered += 1;
    const itemCtx: Ctx = {
      ...ctx,
      list: ctx.list ? { ...ctx.list, number: ctx.list.type === "ordered" ? ordered : undefined } : undefined,
    };
    // Iterate li.childNodes: accumulate inline into a buffer, flush on blocks.
    let buf: ChildNode[] = [];
    const flush = () => {
      if (!buf.length) return;
      const runs = collectRunsFromNodes(buf, readRunStyle(li));
      if (runs.length || true) {
        blocks.push({
          type: "paragraph",
          data: { kind: "p", runs, ...ctxList(itemCtx), ...ctxQuote(itemCtx) },
        });
      }
      buf = [];
    };
    for (const node of Array.from(li.childNodes)) {
      if (node.nodeType === 1 && BLOCK_TAGS.has((node as Element).tagName.toLowerCase())) {
        flush();
        dispatchBlock(node as Element, blocks, itemCtx);
      } else {
        buf.push(node);
      }
    }
    flush();
  }
}

function makeParagraph(el: Element, kind: ParagraphKind, ctx: Ctx): Paragraph {
  const s = (el as HTMLElement).style;
  const p: Paragraph = { kind, runs: collectRuns(el) };
  const align = readAlign(s.textAlign);
  if (align) p.align = align;
  const mt = parsePx(s.marginTop);
  if (mt != null) p.marginTopPx = mt;
  const mb = parsePx(s.marginBottom);
  if (mb != null) p.marginBottomPx = mb;
  const lh = parseFloat(s.lineHeight);
  if (!isNaN(lh) && s.lineHeight && s.lineHeight !== "normal") p.lineHeight = lh;
  Object.assign(p, ctxList(ctx), ctxQuote(ctx));
  return p;
}

function makePre(el: HTMLElement, ctx: Ctx): Paragraph {
  const code = el.querySelector("code");
  const codeEl = code ?? el;
  const base = readRunStyle(codeEl as HTMLElement);
  const preBg = normalizeColor(el.style.backgroundColor);
  let runs = collectRunsFromNodes(Array.from(codeEl.childNodes), base);
  if (preBg) for (const r of runs) if (!r.highlight) r.highlight = preBg;
  const p: Paragraph = { kind: "pre", runs };
  Object.assign(p, ctxList(ctx), ctxQuote(ctx));
  return p;
}

function makeTable(el: Element): Table {
  const rows = [];
  for (const tr of Array.from(el.querySelectorAll("tr"))) {
    const cells: TableCell[] = [];
    for (const cell of Array.from(tr.children)) {
      const tag = cell.tagName.toLowerCase();
      if (tag !== "th" && tag !== "td") continue;
      const s = (cell as HTMLElement).style;
      const tc: TableCell = { runs: collectRuns(cell) };
      if (tag === "th") tc.isHeader = true;
      const bg = normalizeColor(s.backgroundColor);
      if (bg) tc.bg = bg;
      const align = readAlign(s.textAlign);
      if (align) tc.align = align;
      cells.push(tc);
    }
    if (cells.length) rows.push({ cells });
  }
  return { rows };
}

function readQuote(el: HTMLElement): QuoteInfo | undefined {
  const s = el.style;
  const borderColor = extractBorderColor(s.borderLeft) ?? normalizeColor(s.borderColor);
  const bg = normalizeColor(s.backgroundColor);
  const paddingLeftPx = parsePx(s.paddingLeft);
  if (!borderColor && !bg && paddingLeftPx == null) return undefined;
  return { borderColor, bg, paddingLeftPx };
}

// --- inline run collection -------------------------------------------------

/** Collect inline runs from an element's children, starting from its own style. */
function collectRuns(el: Element): Run[] {
  return collectRunsFromNodes(Array.from(el.childNodes), readRunStyle(el));
}

/** Collect inline runs from a node list, accumulating run-style context. */
function collectRunsFromNodes(nodes: ArrayLike<Node> | Node[], base: Partial<Run>): Run[] {
  const runs: Run[] = [];
  const visit = (node: Node, ctx: Partial<Run>) => {
    if (node.nodeType === 3) {
      const t = node.nodeValue ?? "";
      if (t) runs.push({ text: t, ...ctx });
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      runs.push({ text: "\n", ...ctx });
      return;
    }
    if (tag === "img") {
      const alt = el.getAttribute("alt");
      runs.push({ text: alt ? `[${alt}]` : "[图片]", ...ctx });
      return;
    }
    const childCtx: Partial<Run> = { ...ctx, ...readRunStyle(el) };
    if (tag === "a") childCtx.link = { href: el.getAttribute("href") || "#" };
    for (const c of Array.from(el.childNodes)) visit(c, childCtx);
  };
  for (const n of Array.from(nodes)) visit(n, base);
  return mergeRuns(runs).filter((r) => r.text !== "");
}

function mergeRuns(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (last && sameStyle(last, r)) last.text += r.text;
    else out.push({ ...r });
  }
  return out;
}

function sameStyle(a: Run, b: Run): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.strike === b.strike &&
    a.underline === b.underline &&
    a.color === b.color &&
    a.highlight === b.highlight &&
    a.fontFamily === b.fontFamily &&
    a.fontSizePx === b.fontSizePx &&
    a.link?.href === b.link?.href
  );
}

// --- style readers ---------------------------------------------------------

/** Read the run-level style off an element's CSSStyleDeclaration. */
function readRunStyle(el: Element): Partial<Run> {
  const s = (el as HTMLElement).style;
  const o: Partial<Run> = {};
  const fw = s.fontWeight;
  if (fw) o.bold = fw === "bold" || fw === "bolder" || parseInt(fw, 10) >= 600;
  const fst = s.fontStyle;
  if (fst === "italic" || fst === "oblique") o.italic = true;
  const td = s.textDecoration || s.textDecorationLine;
  if (td) {
    if (td.includes("line-through")) o.strike = true;
    if (td.includes("underline")) o.underline = true;
  }
  const color = normalizeColor(s.color);
  if (color) o.color = color;
  const bg = normalizeColor(s.backgroundColor);
  if (bg) o.highlight = bg;
  if (s.fontFamily) o.fontFamily = firstFamily(s.fontFamily);
  if (s.fontSize) {
    const px = parseFloat(s.fontSize);
    if (!isNaN(px)) o.fontSizePx = px;
  }
  return o;
}

function readAlign(v: string): Align | undefined {
  switch ((v || "").trim().toLowerCase()) {
    case "center":
      return "center";
    case "right":
      return "right";
    case "justify":
    case "justified":
      return "justify";
    case "left":
      return "left";
    default:
      return undefined;
  }
}

function parsePx(v: string): number | undefined {
  if (!v) return undefined;
  const m = v.trim().match(/^([\d.]+)px$/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  return isNaN(n) ? undefined : n;
}

/** First family of a CSS font stack, quotes stripped. */
function firstFamily(fontFamily: string): string {
  const first = fontFamily.split(",")[0] ?? "";
  return first.trim().replace(/^['"]|['"]$/g, "");
}

/** Extract a #hex color from a border shorthand like "4px solid #dfe2e5". */
function extractBorderColor(border: string): string | undefined {
  if (!border || border === "none" || border === "initial") return undefined;
  const m = border.match(/#([0-9a-f]{3,8})\b/i) || border.match(/rgba?\([^)]+\)/i);
  return m ? normalizeColor(m[0]) : undefined;
}

/** Normalize any CSS color to "#RRGGBB" (alpha composited over white). */
function normalizeColor(v: string): string | undefined {
  if (!v) return undefined;
  const s = v.trim().toLowerCase();
  if (s === "transparent" || s === "rgba(0, 0, 0, 0)") return undefined;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^#([0-9a-f]{6})$/))) return "#" + m[1];
  if ((m = s.match(/^#([0-9a-f]{3})$/))) {
    const h = m[1];
    return "#" + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if ((m = s.match(/^#([0-9a-f]{8})$/))) {
    const h = m[1];
    return rgbaToHex(
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      parseInt(h.slice(6, 8), 16) / 255
    );
  }
  if ((m = s.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,]+([\d.]+))?\s*\)/))) {
    return rgbaToHex(+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]);
  }
  return undefined; // unknown (named colors) — skip
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  // Composite over white (v0.1.0: no real ancestor-background compositing).
  const c = (x: number) => Math.round(x * a + 255 * (1 - a));
  const hx = (x: number) => c(x).toString(16).padStart(2, "0");
  return "#" + hx(r) + hx(g) + hx(b);
}
