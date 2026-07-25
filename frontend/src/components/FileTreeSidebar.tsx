"use client";

import { LoaderCircle, X } from "lucide-react";
import { FileTree } from "./FileTree";
import type { TreeNode } from "@/native/types";

interface Props {
  root: TreeNode | null;
  activePath: string | null;
  loading: boolean;
  onOpenFile: (path: string) => void;
  onClose: () => void;
}

/**
 * Fixed-width (w-60) left sidebar showing a folder's tree. Returns null when no
 * folder is open, so it costs zero layout space. Clicking a file lazy-loads it as
 * a tab via onOpenFile; the × clears the tree. Desktop-only — rendered by
 * page.tsx inside the desktop layout branch.
 */
export function FileTreeSidebar({ root, activePath, loading, onOpenFile, onClose }: Props) {
  if (!root) return null;
  const empty = !root.children || root.children.length === 0;
  return (
    <aside className="flex w-60 shrink-0 flex-col overflow-hidden border-r bg-background">
      <div className="flex min-h-10.5 shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5">
        <span className="truncate text-xs font-semibold" title={root.path}>
          {root.name}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭文件树"
          title="关闭文件树"
          className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
            <LoaderCircle className="size-3 animate-spin" /> 加载中…
          </div>
        ) : empty ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">该文件夹下没有 .md 文件</div>
        ) : (
          <FileTree nodes={root.children!} activePath={activePath} onOpenFile={onOpenFile} />
        )}
      </div>
    </aside>
  );
}
