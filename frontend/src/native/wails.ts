/**
 * Wails-side native implementation. Forwards to the Go App methods that Wails
 * injects at runtime on `window.go.main.App`, and to the Wails JS runtime for
 * the clipboard. These globals only exist inside the Wails webview; this module
 * is only selected when `window.go` is present (see ./index.ts), so it's safe to
 * bundle into the web build too.
 */
import type { Native } from "./types";

/** The generated/wails-injected binding namespace. */
function app(): {
  CopyAsWeChatHTML(html: string): Promise<void>;
  CopyAsRTF(rtf: string): Promise<void>;
  SaveTextFile(content: string, defaultName: string): Promise<void>;
  SaveBytesFile(b64: string, defaultName: string): Promise<void>;
  OpenBytesFile(): Promise<{ name: string; contentB64: string }>;
  OpenTextFile(): Promise<{ name: string; content: string }>;
} | undefined {
  return (window as unknown as { go?: { main?: { App?: any } } }).go?.main?.App;
}

export const wailsNative: Native = {
  isWails: true,

  async copyWeChatHTML(html: string): Promise<void> {
    // Go side writes Windows CF_HTML — preserves inline styles for 公众号 paste.
    const a = app();
    if (!a) throw new Error("Wails 绑定不可用");
    await a.CopyAsWeChatHTML(html);
  },

  async copyRTF(rtf: string): Promise<void> {
    // Go side writes Windows CF_RTF ("Rich Text Format") — Word/WPS paste with
    // fonts/colors/layout intact. (The htmlFallback is a web-only concern.)
    const a = app();
    if (!a) throw new Error("Wails 绑定不可用");
    await a.CopyAsRTF(rtf);
  },

  async saveText(content: string, defaultName: string): Promise<void> {
    const a = app();
    if (!a) throw new Error("Wails 绑定不可用");
    await a.SaveTextFile(content, defaultName);
  },

  async saveBytes(bytes: Uint8Array, defaultName: string): Promise<void> {
    // The JS↔Go bridge marshals strings cleanly; pass the bytes as base64 and
    // let Go decode before writing (avoids truncation on some Wails versions).
    const a = app();
    if (!a) throw new Error("Wails 绑定不可用");
    await a.SaveBytesFile(bytesToBase64(bytes), defaultName);
  },

  async openBytes(): Promise<{ name: string; bytes: Uint8Array } | null> {
    // Go returns base64 (the JS↔Go bridge marshals strings cleanly); decode back
    // to Uint8Array so callers get raw bytes regardless of format.
    const a = app();
    if (!a) throw new Error("Wails 绑定不可用");
    const res = await a.OpenBytesFile();
    return res ? { name: res.name, bytes: bytesFromBase64(res.contentB64) } : null;
  },

  async openText(): Promise<{ name: string; content: string } | null> {
    const a = app();
    if (!a) throw new Error("Wails 绑定不可用");
    const res = await a.OpenTextFile();
    return res ? { name: res.name, content: res.content } : null;
  },
};

/** Chunked btoa over a Uint8Array (avoids call-stack limits on large docs). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Inverse of bytesToBase64: atob → Uint8Array (for Go's base64 file content). */
function bytesFromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
