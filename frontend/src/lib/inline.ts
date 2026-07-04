/**
 * Inline CSS into HTML using juice. This is the step that makes styles survive
 * the WeChat editor (which strips <style>/class/id but keeps inline `style`).
 */
import juice from "juice";

export function inlineCss(html: string, css: string): string {
  return juice.inlineContent(html, css, {
    applyStyleTags: true,
    removeStyleTags: true,
    preserveMediaQueries: false,
    preserveFontFaces: false,
    preserveImportant: true,
    applyAttributesTableElements: true,
  });
}
