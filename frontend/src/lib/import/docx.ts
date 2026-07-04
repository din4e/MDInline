/**
 * DOCX → HTML via mammoth. This module is the `mammoth` library's only import
 * site, so loading it is deferred (dynamic import) — mammoth is large and only
 * needed when the user imports a .docx.
 *
 * mammoth ships a prebuilt browser UMD bundle (`mammoth/mammoth.browser.js`),
 * which avoids pulling Node-only deps (its `browser` field only remaps two
 * files; the prebuilt bundle is self-contained and the safest Turbopack path).
 */
export async function extractDocxHtml(bytes: Uint8Array): Promise<string> {
  const mod: any = await import("mammoth/mammoth.browser.js");
  // The UMD build may expose convertToHtml on the namespace or under .default.
  const convertToHtml = mod.convertToHtml ?? mod.default?.convertToHtml;
  if (typeof convertToHtml !== "function") {
    throw new Error("mammoth 加载异常:找不到 convertToHtml");
  }
  const result = await convertToHtml({ arrayBuffer: bytes.buffer });
  return (result?.value as string) ?? "";
}
