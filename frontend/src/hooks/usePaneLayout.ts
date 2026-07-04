"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "mdcss.layout.v1";

export type SidePane = "editor" | "style";
export type Collapse = Record<SidePane, boolean>;

/** Minimum pane sizes as a fraction of the layout container width. */
const MIN = { editor: 0.15, style: 0.16, preview: 0.32 };

interface Persisted {
  editor: number;
  style: number;
  collapse: Collapse;
}

const DEFAULTS: Persisted = {
  editor: 0.3,
  style: 0.235,
  collapse: { editor: false, style: false },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Desktop (≥1100px) pane layout: the two side panes (editor, style) are
 * resizable via drag handles and fully collapsible — collapsed means removed
 * from the layout entirely (0 width, not a rail), with a floating edge tab in
 * the page to reopen them. Preview always stays open and absorbs the freed
 * space. Sizes are stored as fractions of the container width, so they survive
 * window resizing without re-clamping.
 *
 * Disabled below the desktop breakpoint — the caller falls back to the static
 * responsive grid/tabs layout.
 */
export function usePaneLayout(enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState(DEFAULTS.editor);
  const [style, setStyle] = useState(DEFAULTS.style);
  const [collapse, setCollapse] = useState<Collapse>(DEFAULTS.collapse);

  /** Snapshot taken at drag start: fractions + collapse state + container px. */
  const drag = useRef({ editor: 0, style: 0, collapse: DEFAULTS.collapse, w: 0 });
  /** Always-fresh values for the persist-on-end path. */
  const latest = useRef({ editor, style, collapse });
  latest.current = { editor, style, collapse };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<Persisted>;
      if (typeof p.editor === "number") setEditor(clamp(p.editor, MIN.editor, 1));
      if (typeof p.style === "number") setStyle(clamp(p.style, MIN.style, 1));
      if (p.collapse)
        setCollapse({ editor: !!p.collapse.editor, style: !!p.collapse.style });
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Persisted) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const beginDrag = useCallback(() => {
    const w = containerRef.current?.clientWidth ?? 0;
    drag.current = { editor, style, collapse, w };
  }, [editor, style, collapse]);

  const onEditorDrag = useCallback((deltaPx: number) => {
    const s = drag.current;
    if (!s.w) return;
    const styleFrac = s.collapse.style ? 0 : s.style;
    const maxEditor = 1 - MIN.preview - styleFrac;
    setEditor(clamp(s.editor + deltaPx / s.w, MIN.editor, maxEditor));
  }, []);

  const onStyleDrag = useCallback((deltaPx: number) => {
    const s = drag.current;
    if (!s.w) return;
    // Style is the right pane: dragging the handle rightwards (delta > 0)
    // shrinks it, so subtract.
    const editorFrac = s.collapse.editor ? 0 : s.editor;
    const maxStyle = 1 - MIN.preview - editorFrac;
    setStyle(clamp(s.style - deltaPx / s.w, MIN.style, maxStyle));
  }, []);

  const endDrag = useCallback(() => {
    persist(latest.current);
  }, [persist]);

  const toggle = useCallback(
    (pane: SidePane) => {
      setCollapse((c) => {
        const next: Collapse = { ...c, [pane]: !c[pane] };
        persist({ ...latest.current, collapse: next });
        return next;
      });
    },
    [persist]
  );

  return {
    enabled,
    containerRef,
    editor,
    style,
    collapse,
    beginDrag,
    onEditorDrag,
    onStyleDrag,
    endDrag,
    toggle,
  };
}
