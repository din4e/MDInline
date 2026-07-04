/**
 * generateCSS — turn a ThemeConfig into a CSS string, all scoped under `.mdcss`.
 *
 * The rendered Markdown HTML is wrapped in `<div class="mdcss">…</div>` before
 * juice inlines it, so every selector here descends from `.mdcss` and matches.
 */
import type { ThemeConfig } from "./theme";
import { HL_THEMES } from "./hlThemes";

const px = (n: number) => `${n}px`;

export function generateCSS(t: ThemeConfig): string {
  const b = t.base;
  const s = t.spacing;
  const c = t.code;
  const im = t.image;
  const parts: string[] = [];

  parts.push(`.mdcss{font-family:${b.fontFamily};font-size:${px(b.fontSize)};color:${b.fontColor};line-height:${b.lineHeight};letter-spacing:${px(b.letterSpacing)};background-color:${b.bgColor};text-align:${b.textAlign};overflow-wrap:break-word;line-break:strict;}`);
  parts.push(`.mdcss *{box-sizing:border-box;}`);
  // Base text props inlined on EVERY text-bearing element — not only inherited
  // from .mdcss. When users "select all → copy" out of a browser, the clipboard
  // carries each element's OWN inline style only; inherited font/color/spacing
  // would be lost, so pasting into 公众号 drops the font. Putting these directly
  // on each element makes the export-HTML → copy → 公众号 workflow keep the font.
  // Element-specific rules below override font-size/color where they need to.
  const baseText = `font-family:${b.fontFamily};font-size:${px(b.fontSize)};color:${b.fontColor};line-height:${b.lineHeight};letter-spacing:${px(b.letterSpacing)};overflow-wrap:break-word;line-break:strict`;
  // `.mdcss section` is included because every `<li>`'s content is wrapped in a
  // `<section>` (see md.ts) — so the list-item TEXT actually lives in `<section>`,
  // and putting baseText directly on it (not just inheriting from `<li>`) makes the
  // font survive the select-all → copy → 公众号 path even if inheritance through
  // `<li>` were stripped. Mirrors mdnice's deliberate "style `li section`, not `li`".
  parts.push(`.mdcss p,.mdcss li,.mdcss section,.mdcss ul,.mdcss ol,.mdcss blockquote,.mdcss td,.mdcss th,.mdcss h1,.mdcss h2,.mdcss h3,.mdcss h4,.mdcss h5,.mdcss h6{${baseText};}`);
  parts.push(`.mdcss strong,.mdcss b{font-weight:${b.boldWeight};}`);
  parts.push(`.mdcss em,.mdcss i{font-style:italic;}`);
  parts.push(`.mdcss del,.mdcss s{text-decoration:line-through;}`);

  // Paragraphs
  parts.push(`.mdcss p{margin:0 0 ${px(b.paragraphSpacing)};}`);
  parts.push(`.mdcss p:last-child{margin-bottom:0;}`);

  // Headings
  (Object.keys(t.headings) as Array<keyof typeof t.headings>).forEach((k) => {
    const h = t.headings[k];
    const rules = [
      `font-size:${px(h.fontSize)}`,
      `color:${h.color}`,
      `font-weight:${h.fontWeight}`,
      `line-height:1.4`,
      `margin-top:${px(h.marginTop)}`,
      `margin-bottom:${px(h.marginBottom)}`,
      `text-align:${h.textAlign}`,
    ];
    if (h.underline) {
      rules.push(`border-bottom:${px(h.underline.width)} solid ${h.underline.color}`, `padding-bottom:6px`);
    }
    parts.push(`.mdcss ${k}{${rules.join(";")};}`);
  });

  // Links
  parts.push(`.mdcss a{color:${t.link.color};text-decoration:${t.link.decoration};}`);

  // Lists
  parts.push(`.mdcss ul,.mdcss ol{margin:${px(s.listMarginTop)} 0 ${px(s.listMarginBottom)};padding-left:${px(s.listPaddingLeft)};}`);
  parts.push(`.mdcss li{margin:4px 0;}`);
  parts.push(`.mdcss li:last-child{margin-bottom:0;}`);

  // Blockquote
  parts.push(`.mdcss blockquote{margin:${px(s.listMarginTop)} 0 ${px(s.listMarginBottom)};padding:${px(s.blockquotePadding)} ${px(Math.round(s.blockquotePadding * 1.5))};background-color:${s.blockquoteBg};color:${s.blockquoteColor};border-left:${px(s.blockquoteBorderWidth)} solid ${s.blockquoteBorderColor};}`);
  parts.push(`.mdcss blockquote p:last-child{margin-bottom:0;}`);

  // Tables
  parts.push(`.mdcss table{width:100%;border-collapse:collapse;margin:16px 0;}`);
  parts.push(`.mdcss th,.mdcss td{border:1px solid ${s.tableBorderColor};padding:8px 12px;}`);
  parts.push(`.mdcss th{background-color:rgba(0,0,0,0.03);font-weight:600;}`);

  // Horizontal rule
  parts.push(`.mdcss hr{border:none;border-top:1px solid ${s.tableBorderColor};margin:24px 0;}`);

  // Inline code (default for ALL <code>…)
  const inlineRules = [
    `background-color:${c.inlineBg}`,
    `color:${c.inlineColor}`,
    `border-radius:${px(c.inlineRadius)}`,
    `padding:${px(c.inlinePaddingY)} ${px(c.inlinePaddingX)}`,
    `font-family:${c.blockFontFamily}`,
  ];
  if (c.inlineFontSize > 0) inlineRules.push(`font-size:${px(c.inlineFontSize)}`);
  parts.push(`.mdcss code{${inlineRules.join(";")};}`);

  // Code block (higher specificity resets the inline-code rule)
  parts.push(`.mdcss pre{background-color:${c.blockBg};border-radius:${px(c.blockRadius)};padding:${px(c.blockPadding)};overflow-x:auto;margin:16px 0;}`);
  parts.push(`.mdcss pre code{background-color:transparent;color:${c.blockColor};font-family:${c.blockFontFamily};font-size:${px(c.blockFontSize)};padding:0;border-radius:0;white-space:pre;}`);

  // Images
  const imgRules = [
    `max-width:${im.maxWidth}%`,
    `border-radius:${px(im.borderRadius)}`,
    `margin-top:${px(im.marginTop)}`,
    `margin-bottom:${px(im.marginBottom)}`,
  ];
  if (im.align === "center") imgRules.push(`display:block`, `margin-left:auto`, `margin-right:auto`);
  parts.push(`.mdcss img{${imgRules.join(";")};}`);

  // Syntax highlighting (inlined into each token span)
  if (c.highlight) {
    parts.push(HL_THEMES[c.hlTheme] ?? HL_THEMES.github);
  }

  // User custom CSS — appended last so it overrides everything.
  if (t.customCss && t.customCss.trim()) {
    parts.push(`/* custom css */ ${t.customCss}`);
  }

  return parts.join("\n");
}
