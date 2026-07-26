"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeNode } from "@/native/types";

interface FileTreeProps {
  nodes: TreeNode[];
  activePath: string | null;
  onOpenFile: (path: string) => void;
  level?: number;
}

/**
 * Recursive, collapsible folder tree. Directories toggle on click (chevron flips
 * + folder icon swaps to open); files call onOpenFile(path). The active file is
 * highlighted. File rows are leaf <button>s (no nested interactive elements).
 */
export function FileTree({ nodes, activePath, onOpenFile, level = 0 }: FileTreeProps) {
  return (
    <ul role="tree" className="py-0.5">
      {nodes.map((node) => (
        <TreeRow
          key={node.path}
          node={node}
          activePath={activePath}
          onOpenFile={onOpenFile}
          level={level}
        />
      ))}
    </ul>
  );
}

function TreeRow({
  node,
  activePath,
  onOpenFile,
  level,
}: {
  node: TreeNode;
  activePath: string | null;
  onOpenFile: (path: string) => void;
  level: number;
}) {
  // Top-level directories render expanded by default; deeper levels start closed.
  const [open, setOpen] = useState(level === 0);
  const isDir = node.kind === "dir";
  const isActive = !isDir && node.path === activePath;

  return (
    <li role="treeitem" aria-expanded={isDir ? open : undefined}>
      <button
        type="button"
        onClick={() => (isDir ? setOpen((v) => !v) : onOpenFile(node.path))}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        title={node.path}
        className={cn(
          "flex w-full items-center gap-1 rounded-sm py-1 pr-2 text-left text-xs transition-colors hover:bg-muted",
          isActive ? "bg-primary/10 text-primary" : "text-foreground",
        )}
      >
        {isDir ? (
          open ? (
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="size-3 shrink-0" aria-hidden="true" />
        )}
        {isDir ? (
          open ? (
            <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="size-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && open && node.children && node.children.length > 0 && (
        <FileTree
          nodes={node.children}
          activePath={activePath}
          onOpenFile={onOpenFile}
          level={level + 1}
        />
      )}
    </li>
  );
}
