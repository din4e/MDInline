"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BackToTopButton, BACK_TO_TOP_THRESHOLD } from "@/components/BackToTopButton";
import { ImageContextMenu, type ImageMenuState } from "@/components/ImageContextMenu";

export function Preview({
  doc,
  iframeRef,
}: {
  doc: string;
  /** Exposes the preview iframe (for scroll-sync). */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}) {
  // We need our own handle on the iframe to wire the contextmenu listener; this
  // callback ref also forwards the element to the optional external ref so
  // page.tsx's scroll-sync keeps working.
  const localRef = useRef<HTMLIFrameElement | null>(null);
  const setIframe = useCallback(
    (el: HTMLIFrameElement | null) => {
      localRef.current = el;
      if (iframeRef) {
        (iframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
      }
    },
    [iframeRef],
  );

  const [menu, setMenu] = useState<ImageMenuState | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  /** Whether the preview is near the top (controls the back-to-top button). */
  const [atTop, setAtTop] = useState(true);
  const scrollToTop = useCallback(() => {
    localRef.current?.contentWindow?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /**
   * Right-click on an image → open the shared save menu. The preview iframe is
   * same-origin (`sandbox="allow-same-origin"`), so the PARENT can reach into
   * `contentDocument` and listen for `contextmenu` there — no `allow-scripts`
   * is needed (and we deliberately keep it off: the rendered doc stays inert).
   * `srcDoc` is replaced on every keystroke, which reloads the iframe and gives
   * us a fresh document, so we re-attach inside the iframe's `load` handler.
   */
  useEffect(() => {
    const iframe = localRef.current;
    if (!iframe) return;

    const onContextmenu = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const img = target?.closest?.("img") as HTMLImageElement | null;
      if (!img || !img.src) {
        setMenu(null); // right-clicked elsewhere → dismiss ours, show native
        return;
      }
      e.preventDefault();
      const rect = iframe.getBoundingClientRect();
      setMenu({
        // currentSrc honors srcset (none today) and falls back to src.
        src: img.currentSrc || img.src,
        alt: img.alt ?? "",
        // clientX/Y are relative to the iframe's own viewport; add the iframe's
        // offset in the parent viewport to get fixed-position coords.
        x: rect.left + e.clientX,
        y: rect.top + e.clientY,
      });
    };

    const onScroll = () => {
      setAtTop((iframe.contentWindow?.scrollY ?? 0) < BACK_TO_TOP_THRESHOLD);
    };
    const onLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.addEventListener("contextmenu", onContextmenu, true);
      // A freshly loaded doc starts at the top; re-arm the button state and
      // watch scroll (same doc-level listener pattern useScrollSync uses).
      setAtTop(true);
      doc.addEventListener("scroll", onScroll, { passive: true });
    };
    iframe.addEventListener("load", onLoad);
    onLoad(); // the first doc may already be loaded before we wired `load`
    return () => iframe.removeEventListener("load", onLoad);
  }, []);

  /**
   * The shared menu's window-level dismiss can't see clicks/scrolls that happen
   * INSIDE the iframe (they target the iframe's own document). Mirror those two
   * signals here so interacting with the preview also closes the menu.
   */
  useEffect(() => {
    if (!menu) return;
    const doc = localRef.current?.contentDocument;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // right-click repositions via contextmenu
      setMenu(null);
    };
    const onScroll = () => setMenu(null);
    doc?.addEventListener("pointerdown", onPointerDown, true);
    doc?.addEventListener("scroll", onScroll, true);
    return () => {
      doc?.removeEventListener("pointerdown", onPointerDown, true);
      doc?.removeEventListener("scroll", onScroll, true);
    };
  }, [menu]);

  return (
    <div className="relative min-h-0 flex-1 bg-muted/70">
      <iframe
        ref={setIframe}
        className="block size-full border-0 bg-muted/70"
        title="预览"
        srcDoc={doc}
        // No allow-scripts: md.ts renders raw HTML (html:true), so this sandbox
        // is what keeps any user-authored <script>/onerror inert in the preview.
        sandbox="allow-same-origin"
      />
      <ImageContextMenu menu={menu} onClose={closeMenu} />
      <BackToTopButton visible={!atTop} onClick={scrollToTop} label="返回预览顶部" />
    </div>
  );
}
