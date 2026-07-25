"use client";

import { useCallback, useState } from "react";
import { native } from "@/native";
import type { TreeNode } from "@/native/types";

export interface FileTreeApi {
  root: TreeNode | null;
  rootName: string | null;
  activePath: string | null;
  loading: boolean;
  openTree: () => Promise<void>;
  setActive: (path: string | null) => void;
  clear: () => void;
}

/**
 * Holds the file-tree state for the VS Code-style left sidebar: the root node
 * (null until a folder is opened), the currently-active file path (for highlight
 * + switch-if-open), and a loading flag while the directory picker / tree build
 * is in flight. The hook does NOT load file content — page.tsx lazy-loads a
 * clicked file via native.readTextFile and pushes it into the workspace.
 */
export function useFileTree(): FileTreeApi {
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openTree = useCallback(async () => {
    setLoading(true);
    try {
      const r = await native.openFolderTree();
      if (!r) return; // cancelled
      setRoot(r);
      setActivePath(null);
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
    openTree,
    setActive: (path) => setActivePath(path),
    clear,
  };
}
