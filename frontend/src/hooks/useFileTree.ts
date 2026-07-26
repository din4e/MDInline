"use client";

import { useCallback, useEffect, useState } from "react";
import { native } from "@/native";
import type { TreeNode } from "@/native/types";

export interface FileTreeApi {
  root: TreeNode | null;
  rootName: string | null;
  activePath: string | null;
  loading: boolean;
  collapsed: boolean;
  openTree: () => Promise<void>;
  setActive: (path: string | null) => void;
  clear: () => void;
  toggleCollapsed: () => void;
}

/**
 * Holds the file-tree state for the VS Code-style left sidebar: the root node
 * (null until a folder is opened), the currently-active file path (for highlight
 * + switch-if-open), and a loading flag while the directory picker / tree build
 * is in flight. The hook does NOT load file content — page.tsx lazy-loads a
 * clicked file via native.readTextFile and pushes it into the workspace.
 */
const COLLAPSED_KEY = "mdcss.filetree.collapsed.v1";

export function useFileTree(): FileTreeApi {
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore the sidebar collapse preference across restarts.
  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const openTree = useCallback(async () => {
    setLoading(true);
    try {
      const r = await native.openFolderTree();
      if (!r) return; // cancelled
      setRoot(r);
      setActivePath(null);
      setCollapsed(false); // opening a folder shows the sidebar
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setRoot(null);
    setActivePath(null);
  }, []);

  return {
    root,
    rootName: root?.name ?? null,
    activePath,
    loading,
    collapsed,
    openTree,
    setActive: (path) => setActivePath(path),
    clear,
    toggleCollapsed,
  };
}
