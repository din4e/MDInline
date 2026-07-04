/**
 * highlight.js theme CSS, embedded as string constants.
 *
 * Why strings (not `import 'highlight.js/styles/x.css'`): avoids needing a
 * `?raw`/`asset/source` loader config. These rules target the `.hljs-*` spans
 * that hljs emits; juice inlines them into each span so colors survive in
 * WeChat. We intentionally do NOT add a base `.hljs { background/padding }`
 * rule — the block background/padding come from the ThemeConfig `.mdcss pre`
 * rules, so the user's code-panel settings always win.
 *
 * Token classes covered: keyword, string, comment, number, title/function,
 * built_in/type, attr/variable, tag/name, meta, regexp, literal, etc.
 */

import type { HlTheme } from "./theme";

type Theme = string;

const github: Theme = `
.mdcss .hljs-comment,.mdcss .hljs-quote{color:#6a737d;font-style:italic;}
.mdcss .hljs-keyword,.mdcss .hljs-selector-tag,.mdcss .hljs-subst{color:#d73a49;}
.mdcss .hljs-string,.mdcss .hljs-regexp,.mdcss .hljs-addition,.mdcss .hljs-attribute{color:#032f62;}
.mdcss .hljs-number,.mdcss .hljs-literal,.mdcss .hljs-built_in,.mdcss .hljs-type,.mdcss .hljs-params,.mdcss .hljs-link{color:#005cc5;}
.mdcss .hljs-title,.mdcss .hljs-section,.mdcss .hljs-function .hljs-title{color:#6f42c1;}
.mdcss .hljs-attr,.mdcss .hljs-variable,.mdcss .hljs-template-variable{color:#e36209;}
.mdcss .hljs-tag,.mdcss .hljs-name,.mdcss .hljs-selector-id,.mdcss .hljs-selector-class{color:#22863a;}
.mdcss .hljs-meta{color:#6a737d;}
.mdcss .hljs-deletion{color:#b31d28;background:#ffeef0;}
.mdcss .hljs-addition{background:#f0fff4;}
.mdcss .hljs-emphasis{font-style:italic;}
.mdcss .hljs-strong{font-weight:700;}
`;

const githubDark: Theme = `
.mdcss .hljs-comment,.mdcss .hljs-quote{color:#8b949e;font-style:italic;}
.mdcss .hljs-keyword,.mdcss .hljs-selector-tag,.mdcss .hljs-subst{color:#ff7b72;}
.mdcss .hljs-string,.mdcss .hljs-regexp,.mdcss .hljs-addition,.mdcss .hljs-attribute{color:#a5d6ff;}
.mdcss .hljs-number,.mdcss .hljs-literal,.mdcss .hljs-built_in,.mdcss .hljs-type,.mdcss .hljs-params,.mdcss .hljs-link{color:#79c0ff;}
.mdcss .hljs-title,.mdcss .hljs-section,.mdcss .hljs-function .hljs-title{color:#d2a8ff;}
.mdcss .hljs-attr,.mdcss .hljs-variable,.mdcss .hljs-template-variable{color:#ffa657;}
.mdcss .hljs-tag,.mdcss .hljs-name,.mdcss .hljs-selector-id,.mdcss .hljs-selector-class{color:#7ee787;}
.mdcss .hljs-meta{color:#8b949e;}
.mdcss .hljs-deletion{color:#ffa198;background:#67060c;}
.mdcss .hljs-addition{background:#033a16;}
.mdcss .hljs-emphasis{font-style:italic;}
.mdcss .hljs-strong{font-weight:700;}
`;

const dracula: Theme = `
.mdcss .hljs-comment,.mdcss .hljs-quote{color:#6272a4;}
.mdcss .hljs-keyword,.mdcss .hljs-selector-tag,.mdcss .hljs-literal,.mdcss .hljs-section{color:#ff79c6;}
.mdcss .hljs-string,.mdcss .hljs-regexp,.mdcss .hljs-addition,.mdcss .hljs-attribute,.mdcss .hljs-attr{color:#f1fa8c;}
.mdcss .hljs-number,.mdcss .hljs-symbol,.mdcss .hljs-bullet{color:#bd93f9;}
.mdcss .hljs-title,.mdcss .hljs-function .hljs-title{color:#50fa7b;}
.mdcss .hljs-variable,.mdcss .hljs-template-variable,.mdcss .hljs-built_in,.mdcss .hljs-type,.mdcss .hljs-params{color:#8be9fd;}
.mdcss .hljs-tag,.mdcss .hljs-name,.mdcss .hljs-selector-id,.mdcss .hljs-selector-class,.mdcss .hljs-link{color:#ff79c6;}
.mdcss .hljs-meta{color:#6272a4;}
.mdcss .hljs-emphasis{font-style:italic;}
.mdcss .hljs-strong{font-weight:700;}
`;

const monokai: Theme = `
.mdcss .hljs-comment,.mdcss .hljs-quote{color:#75715e;}
.mdcss .hljs-keyword,.mdcss .hljs-selector-tag,.mdcss .hljs-literal,.mdcss .hljs-type{color:#66d9ef;font-style:italic;}
.mdcss .hljs-string,.mdcss .hljs-regexp,.mdcss .hljs-addition,.mdcss .hljs-attribute,.mdcss .hljs-attr{color:#e6db74;}
.mdcss .hljs-number,.mdcss .hljs-symbol,.mdcss .hljs-bullet{color:#ae81ff;}
.mdcss .hljs-title,.mdcss .hljs-section,.mdcss .hljs-function .hljs-title{color:#a6e22e;}
.mdcss .hljs-variable,.mdcss .hljs-template-variable,.mdcss .hljs-built_in,.mdcss .hljs-params{color:#fd971f;}
.mdcss .hljs-tag,.mdcss .hljs-name,.mdcss .hljs-selector-id,.mdcss .hljs-selector-class,.mdcss .hljs-link{color:#f92672;font-weight:bold;}
.mdcss .hljs-meta{color:#75715e;}
.mdcss .hljs-emphasis{font-style:italic;}
.mdcss .hljs-strong{font-weight:700;}
`;

const atomOneDark: Theme = `
.mdcss .hljs-comment,.mdcss .hljs-quote{color:#5c6370;font-style:italic;}
.mdcss .hljs-keyword,.mdcss .hljs-selector-tag,.mdcss .hljs-literal,.mdcss .hljs-subst{color:#c678dd;}
.mdcss .hljs-string,.mdcss .hljs-regexp,.mdcss .hljs-addition{color:#98c379;}
.mdcss .hljs-number,.mdcss .hljs-symbol,.mdcss .hljs-bullet{color:#d19a66;}
.mdcss .hljs-title,.mdcss .hljs-section,.mdcss .hljs-function .hljs-title{color:#61afef;}
.mdcss .hljs-attr,.mdcss .hljs-variable,.mdcss .hljs-template-variable,.mdcss .hljs-attribute{color:#e06c75;}
.mdcss .hljs-built_in,.mdcss .hljs-type,.mdcss .hljs-params,.mdcss .hljs-link{color:#56b6c2;}
.mdcss .hljs-tag,.mdcss .hljs-name,.mdcss .hljs-selector-id,.mdcss .hljs-selector-class{color:#e06c75;}
.mdcss .hljs-meta{color:#61afef;}
.mdcss .hljs-emphasis{font-style:italic;}
.mdcss .hljs-strong{font-weight:700;}
`;

export const HL_THEMES: Record<HlTheme, Theme> = {
  github,
  "github-dark": githubDark,
  dracula,
  monokai,
  "atom-one-dark": atomOneDark,
};

export const HL_THEME_LABELS: Record<HlTheme, string> = {
  github: "GitHub 浅色",
  "github-dark": "GitHub 深色",
  dracula: "Dracula",
  monokai: "Monokai",
  "atom-one-dark": "Atom One Dark",
};
