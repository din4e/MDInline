/**
 * Template Market data source.
 *
 * Each non-default template is a `classicTheme()` patch over a stable "classic"
 * base (sans / 15px / line-height 1.75) — NOT over the live DEFAULT_THEME (now
 * a serif 宋体 / 14px / 1.2 theme) — so the curated templates keep their original
 * look regardless of how the app default evolves. The "默认" template is the
 * only one built straight off `cloneTheme(DEFAULT_THEME)`. Every template only
 * ever touches 公众号-safe properties (the same set `lib/css.ts` emits). The 4
 * classic presets (默认 / 紧凑 / 雅致衬线 / 暗夜) are re-expressed here so the market
 * is a superset of the header's quick "预设主题" dropdown; both apply through
 * the same `applyTheme(cloneTheme(...))` path, so the paste-into-公众号 pipeline
 * is untouched.
 *
 * These are plain module constants — built once at load time. `TemplateMarket`
 * memoizes each card's preview document by the (stable) theme reference.
 */
import {
  DEFAULT_THEME,
  FONT_STACK_DEFAULT,
  cloneTheme,
  deepMerge,
  mergeTheme,
  type DeepPartial,
  type ThemeConfig,
} from "./theme";

/**
 * The neutral "classic" base the built-in templates were designed against —
 * sans body / 15px / 1.75 line-height. DEFAULT_THEME has since become a serif
 * 宋体 / 14px / 1.2 theme, so non-default templates merge over THIS instead of
 * over DEFAULT_THEME to preserve their original look.
 */
const CLASSIC_BASE: DeepPartial<ThemeConfig> = {
  base: { fontFamily: FONT_STACK_DEFAULT, fontSize: 15, lineHeight: 1.75 },
};

/** Build a template theme: classic base, then the template's patch on top. */
function classicTheme(patch: DeepPartial<ThemeConfig>): ThemeConfig {
  return deepMerge(mergeTheme(CLASSIC_BASE), patch);
}

export type TemplateCategory = "极简" | "商务" | "文艺" | "科技" | "暗色" | "活力";

export interface MarketTemplate {
  key: string;
  name: string;
  category: TemplateCategory;
  description: string;
  theme: ThemeConfig;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "极简",
  "商务",
  "文艺",
  "科技",
  "暗色",
  "活力",
];

export const MARKET_TEMPLATES: MarketTemplate[] = [
  {
    key: "default",
    name: "默认",
    category: "极简",
    description: "干净利落的系统字，适配绝大多数日常推文，稳妥不出错。",
    theme: cloneTheme(DEFAULT_THEME),
  },
  {
    key: "minimal-white",
    name: "极简白",
    category: "极简",
    description: "去掉所有装饰线，留白舒朗，让文字自己说话。",
    theme: classicTheme({
      meta: { name: "极简白", version: "1.0.0" },
      base: { lineHeight: 1.85, paragraphSpacing: 18, fontColor: "#3a3a3a" },
      headings: {
        h1: { color: "#222222", underline: null, marginBottom: 14 },
        h2: { color: "#222222", underline: null },
        h3: { color: "#333333" }, h4: { color: "#333333" }, h5: { color: "#555555" }, h6: { color: "#888888" },
      },
      spacing: { blockquoteBorderWidth: 3, blockquoteBg: "#fafafa" },
    }),
  },
  {
    key: "muted-gray",
    name: "克制灰",
    category: "极简",
    description: "中灰文字低调内敛，适合长文阅读、纪实与随笔。",
    theme: classicTheme({
      meta: { name: "克制灰", version: "1.0.0" },
      base: { fontColor: "#555555", lineHeight: 1.8 },
      headings: {
        h1: { color: "#444444", underline: null },
        h2: { color: "#444444", underline: { color: "#ececec", width: 1 } },
        h3: { color: "#555555" }, h4: { color: "#555555" }, h5: { color: "#666666" }, h6: { color: "#999999" },
      },
      link: { color: "#666666" },
    }),
  },
  {
    key: "compact",
    name: "紧凑",
    category: "极简",
    description: "小字号密排，信息密度高，适合资讯汇总与周报。",
    theme: classicTheme({
      meta: { name: "紧凑", version: "1.0.0" },
      base: { fontSize: 14, lineHeight: 1.55, paragraphSpacing: 10 },
      headings: {
        h1: { fontSize: 19, marginTop: 16, marginBottom: 8 }, h2: { fontSize: 17, marginTop: 14, marginBottom: 6 },
        h3: { fontSize: 15 }, h4: { fontSize: 14 }, h5: { fontSize: 14 }, h6: { fontSize: 14 },
      },
      spacing: { listMarginTop: 10, listMarginBottom: 10 },
      code: { blockFontSize: 12 },
    }),
  },
  {
    key: "business-blue",
    name: "商务蓝",
    category: "商务",
    description: "深蓝标题沉稳可信，适合行业洞察与企业发布。",
    theme: classicTheme({
      meta: { name: "商务蓝", version: "1.0.0" },
      base: { fontColor: "#2c3e50", lineHeight: 1.75 },
      headings: {
        h1: { color: "#1a4480", underline: { color: "#1a4480", width: 2 } },
        h2: { color: "#1a4480", underline: { color: "#cfe0f5", width: 1 } },
        h3: { color: "#2a5fa0" }, h4: { color: "#2a5fa0" }, h5: { color: "#3a6fb0" }, h6: { color: "#7a8fa0" },
      },
      link: { color: "#1a4480", decoration: "underline" },
      spacing: { blockquoteBg: "#eef4fb", blockquoteBorderColor: "#1a4480", blockquoteColor: "#3a5a80" },
      code: { inlineColor: "#1a4480", inlineBg: "#eef4fb" },
    }),
  },
  {
    key: "pro-report",
    name: "专业报告",
    category: "商务",
    description: "石板灰配衬线英文，研究报告与白皮书的严谨气质。",
    theme: classicTheme({
      meta: { name: "专业报告", version: "1.0.0" },
      base: { fontColor: "#2b2f36", lineHeight: 1.78 },
      headings: {
        h1: { color: "#1f2933", underline: { color: "#1f2933", width: 2 }, fontWeight: 800 },
        h2: { color: "#1f2933", underline: { color: "#d9dee3", width: 1 } },
        h3: { color: "#323a45" }, h4: { color: "#323a45" }, h5: { color: "#5a6470" }, h6: { color: "#8a929b" },
      },
      spacing: { blockquoteBg: "#f3f5f7", blockquoteBorderColor: "#5a6470", blockquoteColor: "#52606d" },
      link: { color: "#1f4068" },
    }),
  },
  {
    key: "elegant-serif",
    name: "雅致衬线",
    category: "文艺",
    description: "棕褐衬线，文艺评论与人物故事的温润质感。",
    theme: classicTheme({
      meta: { name: "雅致衬线", version: "1.0.0" },
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
    key: "classic-book",
    name: "古典书卷",
    category: "文艺",
    description: "暖米底配深棕，古典文学与读书笔记的纸感。",
    theme: classicTheme({
      meta: { name: "古典书卷", version: "1.0.0" },
      base: { fontFamily: 'Georgia, "Songti SC", "SimSun", serif', fontColor: "#3e2c1c", bgColor: "#faf6f0", lineHeight: 1.9, paragraphSpacing: 18 },
      headings: {
        h1: { color: "#5a3a1c", underline: { color: "#5a3a1c", width: 2 } },
        h2: { color: "#5a3a1c", underline: { color: "#d8c3a5", width: 1 } },
        h3: { color: "#6b4423" }, h4: { color: "#6b4423" }, h5: { color: "#8a5a3b" }, h6: { color: "#a08070" },
      },
      spacing: { blockquoteBg: "#f0e6d6", blockquoteBorderColor: "#a08070", blockquoteColor: "#6b5a47" },
      code: { inlineBg: "#f0e6d6", inlineColor: "#6b4423", blockBg: "#f5ede0" },
      link: { color: "#8a5a3b" },
    }),
  },
  {
    key: "code-style",
    name: "代码风",
    category: "科技",
    description: "深色代码块配绿色行内码，技术教程的首选配色。",
    theme: classicTheme({
      meta: { name: "代码风", version: "1.0.0" },
      base: { fontColor: "#24292e", lineHeight: 1.7 },
      headings: {
        h1: { color: "#1f2328", underline: { color: "#1f2328", width: 2 } },
        h2: { color: "#1f2328", underline: { color: "#d0d7de", width: 1 } },
        h3: { color: "#1f2328" }, h4: { color: "#1f2328" }, h5: { color: "#57606a" }, h6: { color: "#8c959f" },
      },
      code: {
        inlineBg: "#e6f4ea", inlineColor: "#1a7e3f", inlineRadius: 4,
        blockBg: "#1e2227", blockColor: "#abb2bf", blockRadius: 8, hlTheme: "atom-one-dark",
      },
      link: { color: "#0969da" },
    }),
  },
  {
    key: "geek-green",
    name: "极客绿",
    category: "科技",
    description: "终端绿配色，极客向的技术分享与开发笔记。",
    theme: classicTheme({
      meta: { name: "极客绿", version: "1.0.0" },
      base: { fontColor: "#2a2a2a", lineHeight: 1.7 },
      headings: {
        h1: { color: "#0ca678", underline: { color: "#0ca678", width: 2 } },
        h2: { color: "#0ca678", underline: { color: "#c3e9db", width: 1 } },
        h3: { color: "#0e8a60" }, h4: { color: "#0e8a60" }, h5: { color: "#3a9b78" }, h6: { color: "#7a9b8c" },
      },
      code: {
        inlineBg: "#e6f7f1", inlineColor: "#0e7a52",
        blockBg: "#0d1117", blockColor: "#7ee787", hlTheme: "github-dark", blockRadius: 8,
      },
      link: { color: "#0ca678" },
    }),
  },
  {
    key: "dark-night",
    name: "暗夜",
    category: "暗色",
    description: "经典暗色主题，夜间阅读与科技向内容的护眼之选。",
    theme: classicTheme({
      meta: { name: "暗夜", version: "1.0.0" },
      base: { fontColor: "#e6e6e6", bgColor: "#1e1e1e", fontFamily: FONT_STACK_DEFAULT },
      headings: {
        h1: { color: "#ffffff", underline: { color: "#444444", width: 1 } },
        h2: { color: "#ffffff", underline: { color: "#444444", width: 1 } },
        h3: { color: "#ffffff" }, h4: { color: "#ffffff" }, h5: { color: "#dddddd" }, h6: { color: "#999999" },
      },
      spacing: { blockquoteBg: "#2a2a2a", blockquoteColor: "#bbbbbb", blockquoteBorderColor: "#444444" },
      code: {
        inlineBg: "#333333", inlineColor: "#e06c75", blockBg: "#282c34", blockColor: "#abb2bf", hlTheme: "atom-one-dark",
      },
      link: { color: "#61afef" },
    }),
  },
  {
    key: "ink-black",
    name: "墨黑",
    category: "暗色",
    description: "纯黑高对比，视觉冲击强烈，适合宣言式表达。",
    theme: classicTheme({
      meta: { name: "墨黑", version: "1.0.0" },
      base: { fontColor: "#f0f0f0", bgColor: "#0a0a0a", lineHeight: 1.8 },
      headings: {
        h1: { color: "#ffffff", underline: { color: "#ffffff", width: 2 } },
        h2: { color: "#f0f0f0", underline: { color: "#3a3a3a", width: 1 } },
        h3: { color: "#e0e0e0" }, h4: { color: "#e0e0e0" }, h5: { color: "#b0b0b0" }, h6: { color: "#808080" },
      },
      spacing: { blockquoteBg: "#1a1a1a", blockquoteColor: "#cccccc", blockquoteBorderColor: "#555555" },
      code: {
        inlineBg: "#1f1f1f", inlineColor: "#ff6b81", blockBg: "#141414", blockColor: "#d0d0d0", hlTheme: "monokai",
      },
      link: { color: "#5ec4ff" },
    }),
  },
  {
    key: "vibrant-orange",
    name: "活力橙",
    category: "活力",
    description: "暖橙标题明快有活力，适合活动与生活方式内容。",
    theme: classicTheme({
      meta: { name: "活力橙", version: "1.0.0" },
      base: { fontColor: "#3a2a1a", lineHeight: 1.8 },
      headings: {
        h1: { color: "#e8590c", underline: { color: "#e8590c", width: 2 } },
        h2: { color: "#e8590c", underline: { color: "#ffe8d9", width: 1 } },
        h3: { color: "#f07f2b" }, h4: { color: "#f07f2b" }, h5: { color: "#d9740a" }, h6: { color: "#b5764a" },
      },
      spacing: { blockquoteBg: "#fff4e6", blockquoteBorderColor: "#e8590c", blockquoteColor: "#8a4a1a" },
      code: { inlineBg: "#fff4e6", inlineColor: "#d9480f" },
      link: { color: "#e8590c" },
    }),
  },
  {
    key: "mint-green",
    name: "薄荷绿",
    category: "活力",
    description: "清新薄荷色，健康、环保、生活类内容的柔和感。",
    theme: classicTheme({
      meta: { name: "薄荷绿", version: "1.0.0" },
      base: { fontColor: "#2a3a33", lineHeight: 1.8 },
      headings: {
        h1: { color: "#0ca678", underline: { color: "#0ca678", width: 2 } },
        h2: { color: "#0ca678", underline: { color: "#d9f5ec", width: 1 } },
        h3: { color: "#12b886" }, h4: { color: "#12b886" }, h5: { color: "#3aa686" }, h6: { color: "#7ab0a0" },
      },
      spacing: { blockquoteBg: "#e6f7f1", blockquoteBorderColor: "#0ca678", blockquoteColor: "#1a6a52" },
      code: { inlineBg: "#e6f7f1", inlineColor: "#0e7a52" },
      link: { color: "#0ca678" },
    }),
  },
];
