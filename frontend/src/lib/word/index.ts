/** Word export/conversion entry points (built on the inlined-HTML pipeline).
 *
 * NOTE: `inlinedHtmlToDocx` lives in `./docx` and is imported dynamically (it is
 * the `docx` library's only import site) so the heavy dependency stays out of
 * the initial bundle. Import it with `await import("@/lib/word/docx")`. */
import { parseInlinedHtml } from "./parse";
import { docToRtf } from "./rtf";

export { buildWordDoc } from "./worddoc";

/** Inlined HTML -> RTF string (for clipboard copy into Word/WPS). */
export function inlinedHtmlToRtf(html: string): string {
  return docToRtf(parseInlinedHtml(html));
}
