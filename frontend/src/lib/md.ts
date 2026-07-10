/**
 * markdown-it instance with highlight.js syntax highlighting.
 *
 * `html: false` so raw HTML in user input is escaped (no <script> injection in
 * the preview). The highlight callback returns just the colored spans; markdown-it
 * wraps them as <pre><code class="language-X">…</code></pre>.
 */
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

export const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  breaks: false,
  highlight(code, lang) {
    let value: string;
    const language = lang && hljs.getLanguage(lang) ? lang : "";
    try {
      value = language
        ? hljs.highlight(code, { language, ignoreIllegals: true }).value
        : hljs.highlightAuto(code).value;
    } catch {
      value = md.utils.escapeHtml(code);
    }
    return value;
  },
});

/**
 * CJK IMEs often emit URL punctuation fullwidth — `https：//example.com` instead
 * of `https://…`. The browser then can't read the scheme and treats the link as a
 * broken relative URL, so clicking it (in the preview) or pasting it (into 公众号)
 * goes nowhere useful. markdown-it routes every link/image href — inline
 * `[t](u)`, reference links, and linkified bare URLs — through `normalizeLink`
 * before mdurl encodes it, so we fold fullwidth `：`/`／` to ASCII here. That fixes
 * the href in both the preview and the copied WeChat HTML in one place.
 */
const baseNormalizeLink = md.normalizeLink.bind(md);
md.normalizeLink = (url: string) =>
  baseNormalizeLink(url.replace(/：/g, ":").replace(/／/g, "/"));

/**
 * Wrap every list item's CONTENT in a `<section>` — i.e. emit
 * `<li><section>…</section></li>` instead of `<li>…</li>`.
 *
 * WeChat's editor mangles a `<li>` that contains an inline-styled run (inline
 * `<code>`, `<strong>`, `<a>`, …): it breaks that run onto its own line, so e.g.
 * `- 内存层：`sleep_mask` → …` pastes as TWO lines — `内存层` alone, then
 * `：sleep_mask → …` below it (any styled run triggers it, colon or not). The
 * proven fix (mdnice) is to wrap the item's content in `<section>` — the one
 * block tag WeChat's sanitizer respects unconditionally — which holds the inline
 * runs on one line. Only `<li>` gets the inner `<section>`; `<p>` and the
 * document root are untouched. `<section>` is WeChat's native structural tag, so
 * it survives paste where `<li>`-with-inline-styles does not.
 *
 * `renderAttrs` is kept so any token attributes (none today, but reserved for
 * e.g. future task-list `id`s) survive — we only ADD the `<section>`.
 */
md.renderer.rules.list_item_open = (tokens, idx, _options, _env, self) =>
  `<li${self.renderAttrs(tokens[idx])}><section>`;
md.renderer.rules.list_item_close = () => `</section></li>`;

/**
 * Self-contained 320×80 PNG placeholder for the specimen image. `via.placeholder.com`
 * has been offline since 2023, so every specimen card showed a broken-image icon.
 * A `data:image/png;base64` URL renders with no network, works in the offline
 * Wails desktop build, AND passes markdown-it's default `validateLink` (which
 * only allows `data:image/(gif|png|jpeg|webp);` — an SVG data URI would render
 * as flat text, and the `http://` in an SVG's xmlns trips the linkifier too).
 */
const SPECIMEN_PLACEHOLDER =
  "data:image/png;base64," +
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAABQCAYAAABoMayFAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAATJSURBVHhe7dsxaxRBHIZxP72lnTZiJam0Mo3apEoTiyCYIoKKKKgo5COcvIFX/hlnZzfJ3oXc+xQ/0N252T3hHmZuzwe//lxsACARAQQQiwACiEUAAcQigABiEUAAsQgggFgEEEAsAgggFgEEEIsAAohFAAHEIoAAYhFAALEIIIBYBBBALAIIIBYBBBCLAAKIRQABxCKAAGIRQACxCCCAWAQQQCwCCCAWAQQQiwBi577//L15e3S8eXbwonse2BUCiDtx8PLV5uGjJ5uj45PueWAXCGCAs/NPl7FZm+btXW+JL99+/JtHK8LemJFtvSe7zXvD/UEAA+wygF7ZrU3z1usQQKyBAGJVuw5ge7zSucPXR9daYfp6BDADAcRWvTx8cxkUhUjb3t6YSt8JavzcA5K5AOohi6/bOz9FrxECmIEAYutq1EarMcdSUZuL5SiA704//AvZEnUOHyOAGQggVuEgbZufGk8F8Pjk9L/XzCGAuQggVnHXAdTKUtvdOvbj569X7rGqq8Q6zscIYAYCiHupBlDbZW2vHS9vuadC5u8H9Zp2qz16HfYPAdxjNQTb1G5DpTfuptq5pV0BavWn7xAdNK3qHj99fjnGq0YdcygVQc9V+ZoEMAMB3GNJAezRtljnNc4xFG1/e+PFYwhgBgKIKxwAr5puyvP0zi01mmMqgFrl6ZzuX6vCujVuacWocRrvlaPPEcAMBBBXOABrBXANvflrAN+fnV9Z4VWKnJ4MK4wapyhOja0PRghgBgIYRttCrYqmPuAOQBtAxeE6Pyr2PGvozV8DqPfkP+u7Pd1rfbLboxWfxmm8Xqco6rivSQAzEMAwCps+4Ipg77wD0AawfaAwx/P0zi01mqMGcO686L5Fq8BR3HxNApiBAAbRqscf8KkVks+3oXNQZEkcPHYNvflr4Hrndf/tPK3e63yOAGYggEEUC324p34CIg5Ab6VXozL6L23icWvozT8XQFHwNU6rPt27t7ta/U5t531NApiBAIbwfxHTVnYULwegF0BxREfhEc/TO+ff441+jiKjOaYC6GOi96D3rbFzwTZfkwBmIIAB6tZ37oPtcVMBrHMpLu15vU5PXrXq8jGP9991zsdGq1HR/SpmbcB6AfSxEY3XNafC6HFz/07YDwQwgD70+lDPxUYcgKkAileTUr9LVEx8vK7ufMx/F73OD1bqfTl4Dqi2qhqjqHqMx+l4DaB426vrO8ZzvwWsr/dxApiBAO45x0oRWLINdABGARRHtT5N1mt0zD8pMc9Zj4nuR/PUiPp+a5gcsPq93VQARxRHfx+o+XWf7Tbc90oAMxDAPaaw+ANdIzPi8b3tbdVuhadWf+Ljc1F11No5NHf7M5ybBHAJX58AZiCAe87fd/XOtbz6WhoAjdf8CpSCqD/XFaF5G3sd7WpVAVfsfLzGchsIYAYCGGouSm2AbkNzLY2gtqZLVqsEEGsggKHqaq9aGqC75gCyBcZtEEAAsQgggFgEEEAsAgggFgEEEIsAAohFAAHEIoAAYhFAALEIIIBYBBBALAIIIBYBBBCLAAKIRQABxCKAAGIRQACxCCCAWAQQQCwCCCAWAQQQiwACiEUAAcQigABiEUAAsQgggFgEEEAsAggg1MXmL1nh63fIjaLYAAAAAElFTkSuQmCC";

/** A sample document shown by default so the preview isn't empty. */
export const SAMPLE_MARKDOWN = `# 欢迎使用微信公众号 Markdown 排版工具

这是一个把 **Markdown** 转成「*可直接粘贴进公众号、样式完整保留*」的 HTML 的小工具。

## 为什么需要内联 CSS

公众号编辑器会**剥离 \`<style>\` 标签和 class**，所以只有把样式「内联」进每个标签的 \`style\` 属性里，排版才能存活。本工具用 \`juice\` 完成这件事。

## 文字与排版

- 支持列表、**加粗**、*斜体*、~~删除线~~
- 支持[超链接](https://weixin.qq.com)
- 行内代码 \`const x = 42\`

> 引用块：这里可以写一些提示或补充说明，左侧带边框，背景着色。

## 代码高亮

\`\`\`js
function greet(name) {
  // 返回问候语
  return \`Hello, \${name}!\`;
}
console.log(greet("WeChat"));
\`\`\`

\`\`\`go
package main

import "fmt"

func main() {
    fmt.Println("Hello, 公众号")
}
\`\`\`

## 表格

| 属性 | 说明 |
| --- | --- |
| 字体 | 正文字体族 |
| 行高 | 控制行间距 |

## 图片

![示意图](https://placehold.co/600x200)

---

左侧编辑 Markdown，右侧实时预览；右上角调节字体、间距、配色等，满意后点「复制(微信)」。
`;

/**
 * Compact representative sample for the in-panel style preview. Covers every
 * element the style panels can tweak (headings / text / inline code / blockquote
 * / list / code block / table / image / link) so adjusting any setting shows an
 * immediate effect regardless of what's in the editor.
 */
export const STYLE_SPECIMEN = `# 标题 H1
## 标题 H2
### 标题 H3

正文：**加粗** *斜体* ~~删除线~~，行内 \`code\`，[链接](https://weixin.qq.com)。

> 引用块示例文字。

- 列表项 A
- 列表项 B

\`\`\`js
function greet(name) {
  return \`Hi, \${name}!\`;
}
\`\`\`

| 列A | 列B |
| --- | --- |
| 内容 | 内容 |

![示意图](${SPECIMEN_PLACEHOLDER})
`;
