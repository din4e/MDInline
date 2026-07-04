// mammoth's prebuilt browser UMD bundle carries no typings; declare it as any.
// (docx.ts uses it via dynamic import and treats the result as any already.)
declare module "mammoth/mammoth.browser.js";
declare module "mammoth/mammoth.browser";
