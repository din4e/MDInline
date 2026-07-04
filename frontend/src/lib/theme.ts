/**
 * ThemeConfig — the single source of truth for all styling.
 *
 * The whole "Markdown → CSS" tool is: take Markdown + a ThemeConfig, render to
 * HTML, turn the ThemeConfig into a CSS string, then inline that CSS into every
 * element's style attribute (so it survives WeChat stripping <style>/class/id).
 *
 * Only WeChat-safe properties are used here (font/color/background/border/
 * border-radius/margin/padding/text-align/line-height/letter-spacing). Avoid
 * position/float/animations — the 公众号 editor strips them.
 */

/** Recursively-optional T — lets presets/patches specify only some fields. */
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type HLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type Align = "left" | "center" | "justify";
export type HlTheme =
  | "github"
  | "github-dark"
  | "dracula"
  | "monokai"
  | "atom-one-dark";

export interface HeadingStyle {
  fontSize: number; // px
  color: string;
  fontWeight: number;
  marginTop: number; // px
  marginBottom: number; // px
  textAlign: Align;
  /** Optional bottom border for H1/H2. null = no underline. */
  underline: { color: string; width: number } | null;
}

export interface ThemeConfig {
  meta: { name: string; version: string; author?: string };
  base: {
    fontFamily: string;
    fontSize: number; // px
    fontColor: string;
    boldWeight: number;
    lineHeight: number;
    letterSpacing: number; // px
    bgColor: string;
    textAlign: Align;
    paragraphSpacing: number; // px
    contentWidth: number; // px — WeChat body width is ~677
  };
  headings: Record<HLevel, HeadingStyle>;
  spacing: {
    listMarginTop: number;
    listMarginBottom: number;
    listPaddingLeft: number;
    blockquotePadding: number;
    blockquoteBg: string;
    blockquoteColor: string;
    blockquoteBorderColor: string;
    blockquoteBorderWidth: number;
    tableBorderColor: string;
  };
  code: {
    inlineBg: string;
    inlineColor: string;
    inlineRadius: number;
    inlinePaddingX: number;
    inlinePaddingY: number;
    inlineFontSize: number; // px; 0 = inherit
    blockBg: string;
    blockColor: string;
    blockFontFamily: string;
    blockFontSize: number; // px
    blockPadding: number; // px
    blockRadius: number;
    highlight: boolean;
    hlTheme: HlTheme;
  };
  image: {
    maxWidth: number; // %
    align: "left" | "center";
    borderRadius: number;
    marginTop: number;
    marginBottom: number;
  };
  link: { color: string; decoration: "none" | "underline" };
  /** Raw CSS appended last (highest priority). User-supplied overrides. */
  customCss?: string;
}

/** A classic Chinese-friendly system font stack. */
export const FONT_STACK_DEFAULT =
  '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
/** Serif (宋体) stack — the app's default body face. SimSun is Windows 宋体,
 *  Songti SC the macOS counterpart, STSong a common extra. */
export const FONT_SERIF_DEFAULT =
  '"SimSun", "Songti SC", "STSong", "FangSong", serif';
export const FONT_MONO_DEFAULT =
  'Menlo, Monaco, Consolas, "Courier New", monospace';

/** WeChat's signature link blue. */
export const WECHAT_LINK = "#576b95";

export const DEFAULT_THEME: ThemeConfig = {
  meta: { name: "默认主题", version: "1.0.0" },
  base: {
    fontFamily: FONT_SERIF_DEFAULT,
    fontSize: 14,
    fontColor: "#333333",
    boldWeight: 700,
    lineHeight: 1.2,
    letterSpacing: 0,
    bgColor: "#ffffff",
    textAlign: "left",
    paragraphSpacing: 16,
    contentWidth: 677,
  },
  headings: {
    h1: { fontSize: 22, color: "#333333", fontWeight: 700, marginTop: 24, marginBottom: 12, textAlign: "left", underline: { color: "#333333", width: 1 } },
    h2: { fontSize: 19, color: "#333333", fontWeight: 700, marginTop: 22, marginBottom: 10, textAlign: "left", underline: { color: "#e3e3e3", width: 1 } },
    h3: { fontSize: 17, color: "#333333", fontWeight: 700, marginTop: 18, marginBottom: 8, textAlign: "left", underline: null },
    h4: { fontSize: 16, color: "#333333", fontWeight: 700, marginTop: 16, marginBottom: 8, textAlign: "left", underline: null },
    h5: { fontSize: 15, color: "#333333", fontWeight: 700, marginTop: 14, marginBottom: 6, textAlign: "left", underline: null },
    h6: { fontSize: 15, color: "#888888", fontWeight: 700, marginTop: 14, marginBottom: 6, textAlign: "left", underline: null },
  },
  spacing: {
    listMarginTop: 16,
    listMarginBottom: 16,
    listPaddingLeft: 24,
    blockquotePadding: 12,
    blockquoteBg: "#f7f7f7",
    blockquoteColor: "#666666",
    blockquoteBorderColor: "#dfe2e5",
    blockquoteBorderWidth: 4,
    tableBorderColor: "#e0e0e0",
  },
  code: {
    inlineBg: "#f2f3f5",
    inlineColor: "#d63384",
    inlineRadius: 3,
    inlinePaddingX: 4,
    inlinePaddingY: 2,
    inlineFontSize: 0,
    blockBg: "#f6f8fa",
    blockColor: "#24292e",
    blockFontFamily: FONT_MONO_DEFAULT,
    blockFontSize: 13,
    blockPadding: 16,
    blockRadius: 6,
    highlight: true,
    hlTheme: "github",
  },
  image: { maxWidth: 100, align: "center", borderRadius: 4, marginTop: 16, marginBottom: 16 },
  link: { color: WECHAT_LINK, decoration: "none" },
};

/** Built-in theme presets (also usable as the "plugin" library seed). */
export const PRESETS: { key: string; name: string; theme: ThemeConfig }[] = [
  { key: "default", name: "默认", theme: cloneTheme(DEFAULT_THEME) },
  {
    key: "dark",
    name: "暗色",
    theme: mergeTheme({
      meta: { name: "暗色", version: "1.0.0" },
      base: { fontColor: "#e6e6e6", bgColor: "#1e1e1e", fontFamily: FONT_STACK_DEFAULT, fontSize: 15, lineHeight: 1.75 },
      headings: {
        h1: { color: "#ffffff", underline: { color: "#444", width: 1 } },
        h2: { color: "#ffffff", underline: { color: "#444", width: 1 } },
        h3: { color: "#ffffff" }, h4: { color: "#ffffff" }, h5: { color: "#dddddd" }, h6: { color: "#999999" },
      },
      spacing: { blockquoteBg: "#2a2a2a", blockquoteColor: "#bbbbbb", blockquoteBorderColor: "#444" },
      code: {
        inlineBg: "#333333", inlineColor: "#e06c75", blockBg: "#282c34", blockColor: "#abb2bf", hlTheme: "atom-one-dark",
      },
      link: { color: "#61afef" },
    }),
  },
  {
    key: "elegant",
    name: "优雅",
    theme: mergeTheme({
      meta: { name: "优雅", version: "1.0.0" },
      base: { fontFamily: 'Georgia, "Songti SC", "SimSun", serif', fontSize: 16, lineHeight: 1.9, fontColor: "#2b2b2b", paragraphSpacing: 18 },
      headings: {
        h1: { color: "#7a4a2b", underline: null },
        h2: { color: "#7a4a2b", underline: { color: "#d8c3a5", width: 1 } },
        h3: { color: "#8a5a3b" }, h4: { color: "#8a5a3b" }, h5: { color: "#8a5a3b" }, h6: { color: "#a08070" },
      },
      spacing: { blockquoteBg: "#faf6f0", blockquoteBorderColor: "#d8c3a5", blockquoteColor: "#6b5a47" },
      code: { inlineBg: "#faf0e6", inlineColor: "#a0522d" },
      link: { color: "#a0522d" },
    }),
  },
  {
    key: "compact",
    name: "紧凑",
    theme: mergeTheme({
      meta: { name: "紧凑", version: "1.0.0" },
      base: { fontFamily: FONT_STACK_DEFAULT, fontSize: 14, lineHeight: 1.55, paragraphSpacing: 10 },
      headings: {
        h1: { fontSize: 19, marginTop: 16, marginBottom: 8 }, h2: { fontSize: 17, marginTop: 14, marginBottom: 6 },
        h3: { fontSize: 15 }, h4: { fontSize: 14 }, h5: { fontSize: 14 }, h6: { fontSize: 14 },
      },
      spacing: { listMarginTop: 10, listMarginBottom: 10 },
      code: { blockFontSize: 12 },
    }),
  },
];

/** Deep-clone via JSON (themes are plain data). */
export function cloneTheme(t: ThemeConfig): ThemeConfig {
  return JSON.parse(JSON.stringify(t)) as ThemeConfig;
}

/** Merge a partial over the default theme (used by presets + imported themes). */
export function mergeTheme(over: DeepPartial<ThemeConfig>): ThemeConfig {
  return deepMerge(cloneTheme(DEFAULT_THEME), over);
}

export function deepMerge<T>(base: T, over: DeepPartial<T>): T {
  if (Array.isArray(base) || typeof base !== "object" || base === null) return base;
  if (typeof over !== "object" || over === null) return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const k of Object.keys(over as Record<string, unknown>)) {
    const ov = (over as Record<string, unknown>)[k];
    out[k] =
      ov && typeof ov === "object" && !Array.isArray(ov) && out[k] && typeof out[k] === "object"
        ? deepMerge(out[k], ov)
        : ov;
  }
  return out;
}
