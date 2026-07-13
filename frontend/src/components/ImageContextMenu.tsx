"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, Link2 } from "lucide-react";
import { toast } from "sonner";
import { native } from "@/native";

/**
 * Right-click image menu shared by the preview and the editor so both panes
 * have the same 保存图片 / 复制图片地址 actions and feel identical.
 *
 * The CALLER owns the `menu` state — when and where it opens is pane-specific
 * (an `<img>` inside the same-origin preview iframe vs. an image card/token in
 * the CodeMirror editor). This component only renders the portal, clamps it
 * on-screen, dismisses it, and performs the two actions.
 *
 * `x`/`y` are viewport coords (position: fixed); the menu is portaled to
 * document.body so no ancestor overflow/transform can clip it.
 */
export interface ImageMenuState {
  src: string;
  alt: string;
  x: number;
  y: number;
}

export function ImageContextMenu({
  menu,
  onClose,
}: {
  menu: ImageMenuState | null;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Dismiss: outside left-click, Escape, or viewport resize. Right-click
  // (button 2) is intentionally ignored here — re-right-clicking repositions via
  // the caller's contextmenu handler, and ignoring it avoids a close-then-open
  // flicker between the native pointerdown and contextmenu events.
  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onResize = () => onClose();
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [menu, onClose]);

  // Keep the menu fully on-screen after it lands — clamp all four edges (the
  // click point can sit near any edge, and a partially-off-screen image can
  // yield negative coords that no real right-click would; clamp those too).
  useEffect(() => {
    if (!menu || !menuRef.current) return;
    const el = menuRef.current;
    const r = el.getBoundingClientRect();
    const pad = 8;
    let left = menu.x;
    let top = menu.y;
    if (left + r.width > window.innerWidth - pad)
      left = Math.max(pad, window.innerWidth - r.width - pad);
    if (top + r.height > window.innerHeight - pad)
      top = Math.max(pad, window.innerHeight - r.height - pad);
    left = Math.max(pad, left);
    top = Math.max(pad, top);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [menu]);

  if (!menu) return null;
  const m = menu;

  const saveImage = async () => {
    try {
      const { bytes, mime } = await fetchImageBytes(m.src);
      await native.saveBytes(bytes, deriveFilename(m.src, mime, m.alt), mime);
      toast("图片已保存");
    } catch {
      // Most likely a cross-origin image without CORS consent — the browser
      // blocks fetch() from reading the bytes. Tell the user, don't fail dark.
      toast("图片保存失败(可能是跨域限制,请改用浏览器「图片另存为」)");
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(m.src);
      toast("图片地址已复制");
    } catch {
      toast("复制失败");
    }
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="图片操作"
      style={{ left: m.x, top: m.y }}
      className="fixed z-50 min-w-40 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      <MenuButton
        icon={<Download className="size-4" />}
        label="保存图片"
        onClick={() => {
          onClose();
          void saveImage();
        }}
      />
      <MenuButton
        icon={<Link2 className="size-4" />}
        label="复制图片地址"
        onClick={() => {
          onClose();
          void copyAddress();
        }}
      />
    </div>,
    document.body,
  );
}

function MenuButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm whitespace-nowrap outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/**
 * Fetch image bytes for any src. `fetch()` transparently handles data:, blob:,
 * and http(s): URLs (the last subject to CORS), and exposes the real MIME via
 * the content-type header — so no hand-rolled data-URL decoder is needed.
 */
async function fetchImageBytes(src: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const mime = (res.headers.get("content-type") || "").split(";")[0].trim() || "image/png";
  return { bytes: new Uint8Array(buf), mime };
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/x-icon": "ico",
  "image/avif": "avif",
};

/**
 * Derive a sane filename: prefer the URL's last path segment, then the alt
 * text, then "image". Ensure it ends with an extension inferred from the MIME
 * so the saved file opens correctly. Strips filesystem-illegal chars + caps
 * length.
 */
function deriveFilename(src: string, mime: string, alt: string): string {
  let name = "";
  if (!src.startsWith("data:")) {
    try {
      const u = new URL(src, typeof location !== "undefined" ? location.href : "https://x");
      name = decodeURIComponent(u.pathname.split("/").pop() || "");
    } catch {
      /* malformed URL — fall through to alt/default */
    }
  }
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim();
  name = clean(name) || clean(alt) || "image";
  if (/\.[a-z0-9]{2,5}$/i.test(name)) return name.slice(0, 80);
  const ext = MIME_EXT[mime.toLowerCase()] || "png";
  return `${name.slice(0, 80 - ext.length - 1)}.${ext}`;
}
