/** One node of the folder tree returned by openFolderTree. */
export type TreeNode = {
  name: string;
  path: string;
  kind: "dir" | "file";
  children?: TreeNode[];
};

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
   * Save raw bytes to a file (used for .docx and for saving preview images).
   * `mime` is only consulted by the Web impl (the Blob's content-type); Wails
   * ignores it — Go `SaveBytesFile` writes the bytes verbatim and infers the
   * type from the file extension in `defaultName`. Defaults to a generic
   * `application/octet-stream` so a bare download always works.
   */
  saveBytes(bytes: Uint8Array, defaultName: string, mime?: string): Promise<void>;
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
  /**
   * Open a folder and return every top-level .md/.markdown file as
   * {name, path, content}. null = cancelled; [] = folder chosen but empty.
   * - Wails: Go `OpenMarkdownFolder` (directory picker + readMarkdownFiles).
   * - Web:   <input type=file webkitdirectory> (path is webkitRelativePath).
   */
  openMarkdownFolder(): Promise<{ name: string; path: string; content: string }[] | null>;
  /**
   * Multi-select markdown/text files → {name, path, content}[]. null/empty = cancelled.
   * - Wails: Go `OpenTextFiles` (OpenMultipleFilesDialog; path is absolute).
   * - Web:   <input type=file multiple> (path is the bare filename).
   */
  openTextFiles(): Promise<{ name: string; path: string; content: string }[] | null>;
  /**
   * Write content to an absolute path with NO dialog (Ctrl+S save-back).
   * - Wails: Go `SaveTextToPath` (writes the file).
   * - Web:   no filesystem access — falls back to a download named after `path`.
   */
  saveTextToPath(content: string, path: string): Promise<void>;
  /**
   * Save-as: show a dialog, write the file, return the chosen path (null = cancelled).
   * - Wails: Go `SaveTextAs` (returns the chosen path or "").
   * - Web:   best-effort download; returns { path: defaultName } (not a real disk path).
   */
  saveTextAs(content: string, defaultName: string): Promise<{ path: string } | null>;
  /**
   * Open a folder and return it as a single root TreeNode (recursive tree of
   * subdirs + .md/.markdown files, NO file content). null = cancelled. Click a
   * file node → readTextFile(path) to lazy-load its content.
   * - Wails: Go `OpenFolderTree` (directory picker + buildFolderTree).
   * - Web:   <input webkitdirectory> → build tree from webkitRelativePath.
   */
  openFolderTree(): Promise<TreeNode | null>;
  /**
   * Read a single file's UTF-8 text by path (lazy load on tree click).
   * - Wails: Go `ReadTextFile` (absolute path).
   * - Web:   looks up the File cached during openFolderTree (keyed by webkitRelativePath).
   */
  readTextFile(path: string): Promise<string>;
}
