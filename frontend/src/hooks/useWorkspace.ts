"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type Workspace,
  type IncomingDoc,
  type Doc,
  WORKSPACE_KEY,
  LEGACY_MARKDOWN_KEY,
  addDocs,
  addUntitled,
  closeDoc,
  switchTo,
  updateContent,
  markSaved,
  renameTitle,
  getActiveDoc,
  deserializeWorkspace,
  serializeWorkspace,
  singleUntitledWorkspace,
} from "@/lib/workspace";
import { SAMPLE_MARKDOWN } from "@/lib/md";

export interface WorkspaceApi {
  docs: Doc[];
  activeId: string;
  activeDoc: Doc | undefined;
  openMany: (files: IncomingDoc[]) => void;
  openUntitled: () => void;
  close: (id: string) => void;
  switchTo: (id: string) => void;
  updateActive: (content: string) => void;
  markSaved: (id: string, path?: string) => void;
  renameTitle: (id: string, title: string) => void;
}

/**
 * Holds the multi-tab Workspace in React state and owns its localStorage
 * hydrate/persist. All state transitions delegate to the pure helpers in
 * @/lib/workspace (which are unit-tested); this hook is a thin wrapper plus IO.
 *
 * Initial state is an empty untitled doc (SSR/prerender-safe); the real workspace
 * loads from localStorage on mount, mirroring page.tsx's `hydrated` pattern.
 */
export function useWorkspace(): WorkspaceApi {
  const [ws, setWs] = useState<Workspace>(() => singleUntitledWorkspace(""));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WORKSPACE_KEY);
      const legacy = localStorage.getItem(LEGACY_MARKDOWN_KEY);
      setWs(deserializeWorkspace(raw, legacy, SAMPLE_MARKDOWN));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(WORKSPACE_KEY, serializeWorkspace(ws));
    } catch {
      /* ignore */
    }
  }, [ws, hydrated]);

  const openMany = useCallback((files: IncomingDoc[]) => setWs((w) => addDocs(w, files)), []);
  const openUntitled = useCallback(() => setWs((w) => addUntitled(w, "")), []);
  const close = useCallback((id: string) => setWs((w) => closeDoc(w, id)), []);
  const switchToFn = useCallback((id: string) => setWs((w) => switchTo(w, id)), []);
  const updateActive = useCallback(
    (content: string) => setWs((w) => updateContent(w, w.activeId, content)),
    [],
  );
  const save = useCallback(
    (id: string, path?: string) => setWs((w) => markSaved(w, id, path)),
    [],
  );
  const rename = useCallback(
    (id: string, title: string) => setWs((w) => renameTitle(w, id, title)),
    [],
  );

  return {
    docs: ws.docs,
    activeId: ws.activeId,
    activeDoc: getActiveDoc(ws),
    openMany,
    openUntitled,
    close,
    switchTo: switchToFn,
    updateActive,
    markSaved: save,
    renameTitle: rename,
  };
}
