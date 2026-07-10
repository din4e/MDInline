"use client";

import { useEffect, useRef } from "react";

/**
 * Proportionally sync the vertical scroll of two containers — the Markdown
 * editor (`.cm-scroller`) and the preview `<iframe>`. When either scrolls, the
 * other is moved to the same scroll *fraction* (not pixel offset), because the
 * rendered HTML and the source are very different heights line-for-line.
 *
 * Both getters are read fresh on every event:
 *  - The editor's scroller only exists once CodeMirror mounts (async), so we
 *    retry via rAF until `getEditor()` returns a node.
 *  - The preview `<iframe>` reloads whenever `srcDoc` changes (every debounced
 *    edit), which throws away its `contentDocument` and any listener on it. We
 *    re-bind on each iframe `load` event instead of relying on a one-shot attach.
 *
 * Feedback loops: when we move side A, side A emits a scroll "echo" back. We
 * suppress that echo directionally — `suppressPreviewEcho` only blocks the
 * preview's echo after *we* wrote the preview; `suppressEditorEcho` only blocks
 * the editor's echo after *we* wrote the editor. Genuine scrolls on the side the
 * user is dragging are never blocked, so fast scrolling stays responsive. The
 * echo is released on the next animation frame; anything that slips through is
 * still damped by the proportional map being idempotent at its fixed point plus
 * a <1px write guard.
 */
export function useScrollSync(
  getEditor: () => HTMLElement | null,
  getPreview: () => HTMLIFrameElement | null,
  enabled: boolean,
) {
  const fns = useRef({ getEditor, getPreview });
  fns.current = { getEditor, getPreview };

  useEffect(() => {
    if (!enabled) return;

    const getEditor = () => fns.current.getEditor();
    const getPreview = () => fns.current.getPreview();

    let editor: HTMLElement | null = null;
    let previewDoc: Document | null = null;
    let attachRaf = 0;
    let editorEchoRaf = 0;
    let previewEchoRaf = 0;
    let stopped = false;
    // Echo suppression flags (see the docblock). Declared up front so the
    // scroll handlers can close over them before they're defined below.
    let suppressEditorEcho = false;
    let suppressPreviewEcho = false;

    const ratioOf = (el: HTMLElement | null) => {
      if (!el) return 0;
      const max = el.scrollHeight - el.clientHeight;
      return max > 0 ? el.scrollTop / max : 0;
    };
    /** Move `target` to `ratio`; returns false (no write) if already within 1px. */
    const apply = (target: HTMLElement | null, ratio: number) => {
      if (!target) return false;
      const max = target.scrollHeight - target.clientHeight;
      const next = max > 0 ? ratio * max : 0;
      if (Math.abs(next - target.scrollTop) < 1) return false;
      target.scrollTop = next;
      return true;
    };

    const onEditorScroll = () => {
      if (suppressEditorEcho || !editor) return;
      const target = getPreview()?.contentDocument?.documentElement ?? null;
      if (!target) return;
      if (apply(target, ratioOf(editor))) {
        // Ignore the preview's echo of our own write, for one frame.
        suppressPreviewEcho = true;
        cancelAnimationFrame(previewEchoRaf);
        previewEchoRaf = requestAnimationFrame(() => (suppressPreviewEcho = false));
      }
    };

    const onPreviewScroll = () => {
      if (suppressPreviewEcho || !previewDoc) return;
      const src = previewDoc.documentElement;
      if (!src || !editor) return;
      if (apply(editor, ratioOf(src))) {
        suppressEditorEcho = true;
        cancelAnimationFrame(editorEchoRaf);
        editorEchoRaf = requestAnimationFrame(() => (suppressEditorEcho = false));
      }
    };

    const bindPreview = () => {
      const doc = getPreview()?.contentDocument ?? null;
      if (!doc || doc === previewDoc) return;
      previewDoc?.removeEventListener("scroll", onPreviewScroll);
      previewDoc = doc;
      doc.addEventListener("scroll", onPreviewScroll, { passive: true });
    };
    const onIframeLoad = () => bindPreview();

    const attach = () => {
      if (stopped) return;
      if (!editor) {
        const e = getEditor();
        if (e) {
          editor = e;
          e.addEventListener("scroll", onEditorScroll, { passive: true });
        }
      }
      const iframe = getPreview();
      if (iframe) {
        iframe.addEventListener("load", onIframeLoad); // re-binds each srcDoc reload
        bindPreview(); // the initial doc may already be loaded (no load event)
      }
      if (!editor || !iframe) attachRaf = requestAnimationFrame(attach);
    };
    attachRaf = requestAnimationFrame(attach);

    return () => {
      stopped = true;
      cancelAnimationFrame(attachRaf);
      cancelAnimationFrame(editorEchoRaf);
      cancelAnimationFrame(previewEchoRaf);
      editor?.removeEventListener("scroll", onEditorScroll);
      previewDoc?.removeEventListener("scroll", onPreviewScroll);
      getPreview()?.removeEventListener("load", onIframeLoad);
    };
  }, [enabled]);
}
