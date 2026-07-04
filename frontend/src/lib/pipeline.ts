/**
 * The end-to-end pipeline: Markdown + ThemeConfig -> inlined HTML.
 *
 *   render() is a pure function (no React) so it's cheap to memoize and can run
 *   in a Web Worker if documents get huge.
 *
 *   buildPreviewDoc() wraps the inlined HTML into a standalone HTML document for
 *   the sandboxed <iframe> srcDoc — the theme's own background fills the whole
 *   pane (no centered card, no grey gutters).
 *
 *   buildExportDoc() produces a self-contained .html file (standalone, styled).
 */
import { md } from "./md";
import { generateCSS } from "./css";
import { inlineCss } from "./inline";
import type { ThemeConfig } from "./theme";

/**
 * Narrow scrollbar styling shared by the on-screen preview iframes so they match
 * the app shell. Deliberately NOT included in buildExportDoc — the copied /
 * exported HTML targets the WeChat editor, where in-article scrollbars don't
 * apply and extra CSS would just be stripped.
 */
const SCROLLBAR_CSS =
  "*{scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.18) transparent}" +
  "*::-webkit-scrollbar{width:8px;height:8px}" +
  "*::-webkit-scrollbar-track,*::-webkit-scrollbar-corner{background:transparent}" +
  "*::-webkit-scrollbar-thumb{background:rgba(0,0,0,.18);border-radius:9999px}" +
  "*::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.3)}";

export interface RenderInput {
  markdown: string;
  theme: ThemeConfig;
}
export interface RenderOutput {
  /** Raw markdown-it HTML (classed, not inlined). */
  html: string;
  /** Generated CSS for the theme. */
  css: string;
  /** <div class="mdcss">…</div> with all CSS inlined — the copy/paste payload. */
  inlined: string;
}

export function render({ markdown, theme }: RenderInput): RenderOutput {
  const html = md.render(markdown || "");
  const css = generateCSS(theme);
  const wrapped = `<div class="mdcss">${html}</div>`;
  const inlined = inlineCss(wrapped, css);
  return { html, css, inlined };
}

/**
 * HTML doc string for the preview iframe. The theme's own background-color
 * (set on `.mdcss` by generateCSS) owns the whole pane — the page and frame are
 * transparent, and `.mdcss` gets the inset padding plus a min-height chain so
 * the theme color fills the pane edge-to-edge and top-to-bottom. "所见即公众号":
 * a white theme reads as a white sheet filling the pane; a dark theme (e.g. 墨黑)
 * fills dark with light text — no centered max-width card, no grey gutters, and
 * no white ring around dark themes (which the old forced-white card produced).
 */
export function buildPreviewDoc(inlined: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
${SCROLLBAR_CSS}
html,body{margin:0;padding:0;height:100%;background:transparent;}
.mdcss-frame{padding:0;min-height:100%;}
.mdcss-frame .mdcss{padding:24px 20px;min-height:100%;box-sizing:border-box;}
</style></head><body><div class="mdcss-frame">${inlined}</div></body></html>`;
}

/**
 * HTML doc for the in-panel style-specimen preview (also used by the Template
 * Market cards). Unlike buildPreviewDoc, the specimen has NO chrome of its own:
 * the page and frame are transparent, so the theme's own background-color (set
 * on `.mdcss` by generateCSS) owns the whole preview. A hardcoded white frame
 * here would put a white ring around dark/warm templates and misrepresent them.
 * `.mdcss` gets the inset padding (generateCSS doesn't set any) and a min-height
 * chain so the theme color fills the frame top-to-bottom even for short specimens.
 */
export function buildSpecimenDoc(inlined: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${SCROLLBAR_CSS}
html,body{margin:0;padding:0;height:100%;background:transparent;}
.mdcss-frame{padding:0;min-height:100%;}
.mdcss-frame .mdcss{padding:14px 16px;min-height:100%;box-sizing:border-box;}
</style></head><body><div class="mdcss-frame">${inlined}</div></body></html>`;
}

/** Self-contained HTML file for "Export HTML". */
export function buildExportDoc(inlined: string, title: string): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head><body>${inlined}</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
