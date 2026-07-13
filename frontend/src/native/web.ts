/** Browser-side native implementation (used when NOT running in Wails). */
import type { Native } from "./types";

export const webNative: Native = {
  isWails: false,

  async copyWeChatHTML(html: string): Promise<void> {
    // Preferred: async Clipboard API writing text/html as the ONLY flavor.
    // (Pairing it with a text/plain slot made 公众号 drop inline styles.)
    const c = navigator.clipboard as Clipboard | undefined;
    if (c?.write && typeof ClipboardItem !== "undefined") {
      try {
        await c.write([
          new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }) }),
        ]);
        return;
      } catch {
        // fall through to legacy method (e.g. not allowed / not focused)
      }
    }
    legacyCopyHtml(html);
  },

  async saveText(content: string, defaultName: string, mime = "text/plain"): Promise<void> {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  async copyRTF(rtf: string, htmlFallback?: string): Promise<void> {
    // Preferred: write RTF as the clipboard's rich-text flavor (Word/WPS read
    // it as CF_RTF on Windows). Browser support varies — if it throws, fall
    // back to styled HTML so Word still pastes with formatting.
    const c = navigator.clipboard as Clipboard | undefined;
    if (c?.write && typeof ClipboardItem !== "undefined") {
      try {
        await c.write([
          new ClipboardItem({
            "text/rtf": new Blob([rtf], { type: "text/rtf" }),
            "application/rtf": new Blob([rtf], { type: "application/rtf" }),
          }),
        ]);
        return;
      } catch {
        // Browser rejected RTF — fall through to the HTML fallback below.
      }
    }
    if (htmlFallback) await webNative.copyWeChatHTML(htmlFallback);
  },

  async saveBytes(
    bytes: Uint8Array,
    defaultName: string,
    mime = "application/octet-stream",
  ): Promise<void> {
    // new Uint8Array(bytes) yields a fresh ArrayBuffer-backed copy, which
    // satisfies BlobPart under TS's typed-array generics (no behavior change).
    const blob = new Blob([new Uint8Array(bytes)], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  async openBytes(accept: string): Promise<{ name: string; bytes: Uint8Array } | null> {
    const file = await pickFile(accept);
    if (!file) return null;
    const buffer = await file.arrayBuffer();
    return { name: file.name, bytes: new Uint8Array(buffer) };
  },

  async openText(accept: string): Promise<{ name: string; content: string } | null> {
    const file = await pickFile(accept);
    if (!file) return null;
    return { name: file.name, content: await file.text() };
  },
};

/**
 * Show the browser file picker and resolve the chosen File, or null on cancel.
 *
 * Listening only to `change` leaks forever on cancel: when the user dismisses
 * the dialog, most browsers never fire `change`, so the promise would never
 * settle and the caller's `busy` flag would stay locked (every header button
 * disabled). We detect cancel by watching the window regain focus after the
 * dialog closes — if `change` hasn't fired shortly after focus returns, the
 * user cancelled.
 */
function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;

    let settled = false;
    const finish = (value: File | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onWindowFocus);
      resolve(value);
    };
    const onWindowFocus = () => {
      // The dialog just closed. Give `change` a beat to land first (on some
      // platforms it fires just after focus), then treat no-selection as cancel.
      window.setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) finish(null);
      }, 500);
    };

    input.addEventListener("change", () => {
      finish((input.files && input.files[0]) ?? null);
    });
    window.addEventListener("focus", onWindowFocus);
    input.click();
  });
}

/**
 * Legacy rich-HTML copy: render the HTML off-screen, select the DOM, and
 * execCommand('copy'). The browser serializes the selection (with its inline
 * styles) into the text/html clipboard flavor — what 公众号 reads on paste.
 * Used when the async Clipboard API is unavailable (older browsers / no focus).
 */
function legacyCopyHtml(html: string): void {
  const host = document.createElement("div");
  host.innerHTML = html;
  host.setAttribute("contenteditable", "true");
  host.style.position = "fixed";
  host.style.left = "-9999px";
  host.style.top = "0";
  document.body.appendChild(host);
  const range = document.createRange();
  range.selectNodeContents(host);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  try {
    document.execCommand("copy");
  } catch {
    /* ignore */
  }
  sel?.removeAllRanges();
  host.remove();
}
