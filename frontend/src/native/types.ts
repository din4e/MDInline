/** The shape both web and Wails native modules implement. */
export interface Native {
  /** True when running inside the Wails desktop webview. */
  isWails: boolean;
  /**
   * Copy the inlined HTML (each element already carries its inline styles) to
   * the clipboard as rich text/html, so it pastes directly into the 公众号
   * editor with all styles intact.
   * - Wails: Go `CopyAsWeChatHTML` → Windows CF_HTML.
   * - Web:   navigator.clipboard.write({ 'text/html' }), with an execCommand
   *          fallback that serializes the rendered DOM. text/html is written as
   *          the SOLE clipboard flavor — pairing it with text/plain made 公众号
   *          drop the inline styles on paste.
   */
  copyWeChatHTML(html: string): Promise<void>;
  /**
   * Copy RTF to the clipboard so it pastes into Word/WPS with fonts, colors,
   * and basic layout intact.
   * - Wails: Go `CopyAsRTF` → Windows CF_RTF ("Rich Text Format" format).
   * - Web:   best-effort `ClipboardItem({ "text/rtf" })`. Browsers vary in RTF
   *          support; on failure it falls back to writing the `htmlFallback`
   *          (the inlined HTML) as text/html so Word still pastes styled content.
   */
  copyRTF(rtf: string, htmlFallback?: string): Promise<void>;
  /** Save text to a file: native save dialog (Wails) or browser download (Web). */
  saveText(content: string, defaultName: string, mime?: string): Promise<void>;
  /**
   * Save raw bytes to a file (used for .docx). Wails base64-encodes and calls
   * Go `SaveBytesFile`; Web triggers a browser download of a typed Blob.
   */
  saveBytes(bytes: Uint8Array, defaultName: string): Promise<void>;
  /**
   * Open a file as raw bytes (used by import — docx is a zip, .doc needs magic
   * sniffing, and binary .doc needs a text scan; text formats decode from the
   * same bytes via TextDecoder). `accept` is a web `<input accept>` hint, ignored
   * by the Wails side which uses a fixed filter covering all importable types.
   * - Wails: Go `OpenBytesFile` → base64 string → decoded back to Uint8Array.
   * - Web:   <input type=file> + FileReader.readAsArrayBuffer.
   */
  openBytes(accept: string): Promise<{ name: string; bytes: Uint8Array } | null>;
  /** Open a text file (e.g. a theme JSON): native open dialog (Wails) or
   *  <input type=file> (Web). Distinct from openBytes so each gets its own
   *  dialog filter (text/JSON vs. the document-import filter). */
  openText(accept: string): Promise<{ name: string; content: string } | null>;
}
